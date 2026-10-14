import { startTransition, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react"
import { flushSync } from "react-dom"
import { getOffsetRange, getRowMetrics, getRowRange, toVirtualOffset, type VirtualRange, type VirtualRowMetrics } from "@cellora/core"

import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect"

export interface VirtualWindow {
  rows: VirtualRange
  columns: VirtualRange
}

interface UseVirtualGridOptions {
  enabled: boolean
  /** The element that scrolls */
  containerRef: RefObject<HTMLElement | null>
  rowCount: number
  rowHeight: number
  /** Tallest scroll extent the browser allows (see `useMaxElementHeight`) */
  maxScrollSize: number
  headerHeight: number
  /** Minimum extra rows rendered above and below the viewport */
  overscanRows: number
  /** Minimum extra columns rendered left and right of the viewport */
  overscanColumns: number
  /** Rows rendered ahead, in viewport heights, on each side (e.g. 2) */
  overscanRowScreens: number
  /** Columns rendered ahead, in viewport widths, on each side */
  overscanColumnScreens: number
  /** Prefix sums of the horizontally scrolling (unpinned) column widths */
  columnOffsets: readonly number[]
  /**
   * Viewport height to assume before the scroll area is measured (its height
   * cap). The first screen of rows is rendered from it, so server-rendered
   * HTML and the very first paint already show rows; 0 renders none.
   */
  initialViewportHeight: number
}

/** Scrolling faster than this (px/s) is a fling: placeholders stay hidden. */
const FAST_SCROLL = 1500
/** How far ahead (seconds of travel) to prepare rows at the current speed. */
const LOOKAHEAD_SECONDS = 0.6
/** Speed is measured over at least this long (ms); no events for IDLE_RESET_MS = stopped. */
const MIN_SAMPLE_MS = 40
const IDLE_RESET_MS = 250
/** Fling must be over for this long (ms) before placeholders may fade in. */
const FAST_SETTLE_MS = 180

const EMPTY_WINDOW: VirtualWindow = {
  rows: { start: 0, end: 0 },
  columns: { start: 0, end: 0 },
}

const sameRange = (a: VirtualRange, b: VirtualRange) => a.start === b.start && a.end === b.end

const sameWindow = (a: VirtualWindow, b: VirtualWindow) => sameRange(a.rows, b.rows) && sameRange(a.columns, b.columns)

const covers = (outer: VirtualRange, inner: VirtualRange) => outer.start <= inner.start && outer.end >= inner.end

/**
 * Which rows and columns to render for the current scroll position.
 *
 * Scrolling is 100% native whenever the rows fit in the browser's maximum
 * element height: rows sit at their real position, so the scroll handler only
 * checks whether the window changed.
 *
 * - The window leans in the scroll direction: `overscanRowScreens` viewports
 *   ahead, one behind. Rows that fall outside it unmount.
 * - While the lookahead holds, re-windowing is a low-priority transition; a
 *   newer scroll position replaces a render that has not finished, so a fast
 *   scroll never renders windows it already left behind.
 * - A scroll that outruns the lookahead first renders a small window
 *   synchronously (just what is on screen), then widens it as a transition.
 * - Content taller than the browser allows ("compressed") additionally needs
 *   the body repositioned per scroll event.
 */
export function useVirtualGrid({
  enabled,
  containerRef,
  rowCount,
  rowHeight,
  maxScrollSize,
  headerHeight,
  overscanRows,
  overscanColumns,
  overscanRowScreens,
  overscanColumnScreens,
  columnOffsets,
  initialViewportHeight,
}: UseVirtualGridOptions) {
  const [viewport, setViewport] = useState({ width: 0, height: initialViewportHeight })
  // The first window comes from the assumed height (scroll position 0), the
  // same on the server and the hydrating client; measuring then corrects it
  const [window, setWindow] = useState<VirtualWindow>(() => {
    if (!enabled || initialViewportHeight <= 0) return EMPTY_WINDOW
    const assumed = getRowMetrics({ count: rowCount, rowSize: rowHeight, headerSize: headerHeight, viewportSize: initialViewportHeight, maxScrollSize })
    return {
      rows: getRowRange({ virtualOffset: 0, metrics: assumed, count: rowCount, rowSize: rowHeight, overscan: overscanRows }),
      columns: getOffsetRange({ offsets: columnOffsets, offset: 0, size: 0, overscan: overscanColumns }),
    }
  })

  const metrics: VirtualRowMetrics = useMemo(
    () =>
      getRowMetrics({
        count: rowCount,
        rowSize: rowHeight,
        headerSize: headerHeight,
        viewportSize: viewport.height,
        maxScrollSize,
      }),
    [rowCount, rowHeight, headerHeight, viewport.height, maxScrollSize]
  )

  /** Element holding the rendered rows */
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const committed = useRef<VirtualWindow>(window)
  const virtualTop = useRef(0)
  const scrollTop = useRef(0)
  /** Smoothed scroll speed in row space, px/s (signed: + is down) */
  const velocity = useRef(0)
  const lastSample = useRef({ time: 0, offset: 0 })
  /** The skeleton overlay; marked `data-fast` while flinging */
  const placeholderRef = useRef<HTMLDivElement | null>(null)
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  /** 1 = scrolling down, -1 = up; kept while the position is unchanged */
  const direction = useRef<1 | -1>(1)
  // Latest inputs, so the scroll listener never goes stale
  const latest = useRef({
    metrics,
    rowCount,
    rowHeight,
    overscanRows,
    overscanColumns,
    overscanRowScreens,
    overscanColumnScreens,
    columnOffsets,
  })

  const applyTransform = useCallback(() => {
    const body = bodyRef.current
    if (!body) return
    const { rowHeight: size, metrics: current } = latest.current
    // Only scaled scrolling moves the body per scroll event; promote it to its
    // own layer then so those moves do not repaint the whole (very wide) body.
    body.style.willChange = current.compressed ? "transform" : ""
    // Row `start` sits at start * size in row space. Uncompressed, scrollTop and
    // virtualTop are equal so this is a constant between window changes.
    body.style.transform = `translate3d(0, ${scrollTop.current - virtualTop.current + committed.current.rows.start * size}px, 0)`
  }, [])

  /** The window to render (with lookahead) and what is actually on screen */
  const compute = useCallback((): {
    next: VirtualWindow
    minimal: VirtualWindow
    visible: VirtualWindow
  } => {
    const element = containerRef.current
    const input = latest.current
    if (!element)
      return {
        next: EMPTY_WINDOW,
        minimal: EMPTY_WINDOW,
        visible: EMPTY_WINDOW,
      }
    if (element.scrollTop !== scrollTop.current) direction.current = element.scrollTop > scrollTop.current ? 1 : -1
    scrollTop.current = element.scrollTop
    virtualTop.current = toVirtualOffset(scrollTop.current, input.metrics)

    // Speed over at least MIN_SAMPLE_MS (two events a millisecond apart say
    // nothing about speed), smoothed so one odd frame does not swing the window
    const now = performance.now()
    const elapsed = now - lastSample.current.time
    if (elapsed >= IDLE_RESET_MS) {
      velocity.current = 0
      lastSample.current = { time: now, offset: virtualTop.current }
    } else if (elapsed >= MIN_SAMPLE_MS) {
      const instant = ((virtualTop.current - lastSample.current.offset) / elapsed) * 1000
      velocity.current = velocity.current * 0.5 + instant * 0.5
      lastSample.current = { time: now, offset: virtualTop.current }
    }

    const rowBase = {
      virtualOffset: virtualTop.current,
      metrics: input.metrics,
      count: input.rowCount,
      rowSize: input.rowHeight,
    }
    const visibleRows = Math.ceil(input.metrics.bodyViewport / input.rowHeight)
    const columnBase = {
      offsets: input.columnOffsets,
      offset: element.scrollLeft,
      size: element.clientWidth,
    }
    // Prepare more rows where the user is heading, keep a screen behind
    const ahead = Math.max(input.overscanRows, Math.ceil(input.overscanRowScreens * visibleRows))
    const behind = Math.max(input.overscanRows, visibleRows)
    const rowBlock = Math.max(input.overscanRows, visibleRows)
    // The faster the scroll, the further ahead rows are prepared (in the
    // direction of travel), in whole blocks so the window does not churn
    const travelRows = Math.min(Math.ceil((Math.abs(velocity.current) * LOOKAHEAD_SECONDS) / input.rowHeight), visibleRows * 6)
    const extra = Math.ceil(travelRows / rowBlock) * rowBlock
    const goingDown = velocity.current >= 0
    return {
      next: {
        rows: getRowRange({
          ...rowBase,
          overscan: ahead,
          overscanBefore: (direction.current === 1 ? behind : ahead) + (goingDown ? 0 : extra),
          overscanAfter: (direction.current === 1 ? ahead : behind) + (goingDown ? extra : 0),
          // Re-window once per screen scrolled, not per row
          block: rowBlock,
        }),
        columns: getOffsetRange({
          ...columnBase,
          overscan: input.overscanColumns,
          overscanSize: input.overscanColumnScreens * element.clientWidth,
          block: input.overscanColumns,
        }),
      },
      // Just enough for the screen: cheap enough to render synchronously
      minimal: {
        rows: getRowRange({ ...rowBase, overscan: input.overscanRows }),
        columns: getOffsetRange({
          ...columnBase,
          overscan: input.overscanColumns,
        }),
      },
      visible: {
        rows: getRowRange({ ...rowBase, overscan: 0 }),
        columns: getOffsetRange({ ...columnBase, overscan: 0 }),
      },
    }
  }, [containerRef])

  // Runs after every commit: publish inputs, then keep transform in step
  useIsomorphicLayoutEffect(() => {
    latest.current = {
      metrics,
      rowCount,
      rowHeight,
      overscanRows,
      overscanColumns,
      overscanRowScreens,
      overscanColumnScreens,
      columnOffsets,
    }
    committed.current = window
    applyTransform()
  })

  // Measure the scroll viewport
  useIsomorphicLayoutEffect(() => {
    const element = containerRef.current
    if (!enabled || !element) return
    const measure = () =>
      setViewport((prev) => (prev.width === element.clientWidth && prev.height === element.clientHeight ? prev : { width: element.clientWidth, height: element.clientHeight }))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [enabled, containerRef])

  // Recompute when anything that shapes the window changes (data, sizes, widths)
  useIsomorphicLayoutEffect(() => {
    if (!enabled) return
    const { next } = compute()
    // The window depends on the DOM's scroll position, which only an effect can
    // read: this is syncing React with an external value, not derived state
    setWindow((prev) => (sameWindow(prev, next) ? prev : next))
  }, [enabled, compute, metrics, columnOffsets, overscanRows, overscanColumns, overscanRowScreens, overscanColumnScreens, viewport.width])

  // During a fling the skeleton would only blink (bars up, rows in, bars up...):
  // keep it hidden while fast, let it fade back in once the scroll settles
  const updatePlaceholder = useCallback(() => {
    const overlay = placeholderRef.current
    if (!overlay) return
    if (Math.abs(velocity.current) > FAST_SCROLL) {
      overlay.setAttribute("data-fast", "")
      clearTimeout(settleTimer.current)
      settleTimer.current = setTimeout(() => overlay.removeAttribute("data-fast"), FAST_SETTLE_MS)
    }
  }, [])

  // Scroll: usually nothing to do; re-window lazily while the lookahead holds
  useEffect(() => {
    const element = containerRef.current
    if (!enabled || !element) return
    const onScroll = () => {
      const { next, minimal, visible } = compute()
      const current = committed.current
      if (!sameWindow(next, current)) {
        if (covers(current.rows, visible.rows) && covers(current.columns, visible.columns)) {
          // Everything on screen is already rendered: update at low priority
          startTransition(() => setWindow(next))
        } else {
          // Scrolled past the lookahead: put the screen's rows in right now,
          // then widen to the full lookahead without blocking the scroll
          flushSync(() => setWindow(minimal))
          startTransition(() => setWindow(next))
          updatePlaceholder()
          return
        }
      }
      // Only scaled scrolling needs the body moved on every scroll event
      if (latest.current.metrics.compressed) applyTransform()
      updatePlaceholder()
    }
    element.addEventListener("scroll", onScroll, { passive: true })
    const timer = settleTimer
    return () => {
      element.removeEventListener("scroll", onScroll)
      // A pending fade-in must not outlive the listener
      clearTimeout(timer.current)
    }
  }, [enabled, containerRef, compute, applyTransform, updatePlaceholder])

  return { window, metrics, viewport, bodyRef, placeholderRef }
}
