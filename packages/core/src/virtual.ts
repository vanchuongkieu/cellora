/**
 * Pure windowing math for virtual scrolling. No DOM, no framework: the React
 * binding (and later Vue) only feed it scroll positions and sizes.
 */

/**
 * Fallback cap for the native scroll extent. Browsers limit element height
 * (~33M px in Chrome/Safari, ~17M in Firefox); the real limit can be measured
 * at runtime and passed to `getRowMetrics`. Content taller than the cap is
 * compressed: native scroll positions are scaled back up to row space.
 */
export const MAX_SCROLL_SIZE = 10_000_000

export interface VirtualRowMetrics {
  /**
   * True when all rows are taller than the browser allows and scroll positions
   * are scaled. Uncompressed grids scroll 100% natively (no per-frame JS).
   */
  compressed: boolean
  /** Height of all rows together, px */
  totalSize: number
  /** Native scroll extent incl. header (clamped to MAX_SCROLL_SIZE + header) */
  scrollSize: number
  /** Largest native scrollTop */
  maxScroll: number
  /** Largest virtual offset (row space) */
  maxVirtual: number
  /** Visible height available to rows (viewport minus header) */
  bodyViewport: number
}

export function getRowMetrics(options: {
  count: number
  rowSize: number
  headerSize: number
  /** Whole scroll viewport height, header included */
  viewportSize: number
  /** Largest native scroll extent to use. Defaults to MAX_SCROLL_SIZE. */
  maxScrollSize?: number
}): VirtualRowMetrics {
  const { count, rowSize, headerSize, viewportSize } = options
  const cap = options.maxScrollSize ?? MAX_SCROLL_SIZE
  const totalSize = count * rowSize
  const bodyViewport = Math.max(0, viewportSize - headerSize)
  const scrollSize = Math.min(totalSize, cap) + headerSize
  return {
    compressed: totalSize > cap,
    totalSize,
    scrollSize,
    maxScroll: Math.max(0, scrollSize - viewportSize),
    maxVirtual: Math.max(0, totalSize - bodyViewport),
    bodyViewport,
  }
}

/** Native scrollTop -> offset in (uncompressed) row space. */
export function toVirtualOffset(scrollTop: number, metrics: VirtualRowMetrics): number {
  if (metrics.maxScroll <= 0) return 0
  const clamped = Math.min(Math.max(scrollTop, 0), metrics.maxScroll)
  // Not compressed: 1:1, avoids float noise
  if (metrics.maxScroll === metrics.maxVirtual) return clamped
  return (clamped / metrics.maxScroll) * metrics.maxVirtual
}

/** Offset in row space -> native scrollTop (for scroll-to-row). */
export function toScrollOffset(virtualOffset: number, metrics: VirtualRowMetrics): number {
  if (metrics.maxVirtual <= 0) return 0
  const clamped = Math.min(Math.max(virtualOffset, 0), metrics.maxVirtual)
  if (metrics.maxScroll === metrics.maxVirtual) return clamped
  return (clamped / metrics.maxVirtual) * metrics.maxScroll
}

export interface VirtualRange {
  /** First index to render (inclusive) */
  start: number
  /** Last index to render (exclusive) */
  end: number
}

/**
 * Rows to render for a virtual offset, with `overscan` rows on both sides.
 *
 * The window is anchored to the first visible row rounded down to a multiple of
 * `block` (default 1), so it only changes once per `block` scrolled rows and
 * the UI re-renders that rarely. It always covers every position inside the
 * current block. `overscanBefore` / `overscanAfter` let the window lean in the
 * scroll direction (prepare more rows where the user is heading).
 */
export function getRowRange(options: {
  virtualOffset: number
  metrics: VirtualRowMetrics
  count: number
  rowSize: number
  overscan: number
  /** Rows kept above the viewport. Defaults to `overscan`. */
  overscanBefore?: number
  /** Rows prepared below the viewport. Defaults to `overscan`. */
  overscanAfter?: number
  block?: number
}): VirtualRange {
  const { virtualOffset, metrics, count, rowSize, overscan } = options
  const before = options.overscanBefore ?? overscan
  const after = options.overscanAfter ?? overscan
  const block = Math.max(1, Math.floor(options.block ?? 1))
  const first = Math.floor(virtualOffset / rowSize)
  const anchor = Math.floor(first / block) * block
  const visible = Math.ceil(metrics.bodyViewport / rowSize) + 1
  return {
    start: Math.max(0, anchor - before),
    end: Math.min(count, anchor + block + visible + after),
  }
}

/** Prefix sums of sizes: offsets[i] is where item i starts, last is the total. */
export function createOffsets(sizes: readonly number[]): number[] {
  const offsets = new Array<number>(sizes.length + 1)
  offsets[0] = 0
  for (let i = 0; i < sizes.length; i++) offsets[i + 1] = offsets[i] + sizes[i]
  return offsets
}

/** Index of the item containing `offset` (binary search). Clamped to the list. */
export function findIndexAtOffset(offsets: readonly number[], offset: number): number {
  const lastItem = offsets.length - 2
  if (lastItem < 0) return 0
  let low = 0
  let high = lastItem
  while (low < high) {
    const mid = (low + high + 1) >>> 1
    if (offsets[mid] <= offset) low = mid
    else high = mid - 1
  }
  return low
}

/**
 * Variable-size items (columns) overlapping [offset, offset + size), plus
 * lookahead on each side: `overscan` whole items and/or `overscanSize` px.
 * Anchored like `getRowRange`: the window only changes when the first visible
 * item crosses a `block` boundary.
 */
export function getOffsetRange(options: {
  offsets: readonly number[]
  offset: number
  size: number
  overscan: number
  /** Extra lookahead in px on each side (e.g. two viewport widths). */
  overscanSize?: number
  /** Window changes once per this many items. Defaults to 1. */
  block?: number
}): VirtualRange {
  const { offsets, offset, size, overscan } = options
  const lookahead = options.overscanSize ?? 0
  const block = Math.max(1, Math.floor(options.block ?? 1))
  const count = offsets.length - 1
  if (count <= 0) return { start: 0, end: 0 }
  const first = findIndexAtOffset(offsets, offset)
  const anchor = Math.floor(first / block) * block
  // Furthest scroll position that still maps to this anchor is the end of its
  // block; the window must reach whatever is visible from there.
  const blockEnd = offsets[Math.min(anchor + block, count)]
  const firstWanted = findIndexAtOffset(offsets, offsets[anchor] - lookahead)
  const last = findIndexAtOffset(offsets, blockEnd + size + lookahead)
  return {
    start: Math.max(0, firstWanted - overscan),
    end: Math.min(count, last + 1 + overscan),
  }
}
