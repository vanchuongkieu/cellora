import { useState, type RefObject } from "react"

import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect"

interface UseFillHeightOptions {
  enabled: boolean
  /** Pixels to leave free below the grid (e.g. a fixed bar), on top of what is measured */
  offset: number
  /** The grid is never made shorter than this */
  min: number
  /** Measure against this scrolling element instead of the window */
  container?: RefObject<HTMLElement | null> | HTMLElement | null
}

const resolve = (container: UseFillHeightOptions["container"]) => (container && "current" in container ? container.current : container) ?? undefined

/**
 * The height the scroll area needs to fill what is left of the screen, with no
 * page scroll.
 *
 * Instead of adding up the parts around the grid (header, toolbar, margins,
 * paddings, borders, footer, ...) it asks the layout: the area is briefly made
 * exactly one screen tall, so everything else on the page is whatever the page
 * is taller than that. The screen height minus that is the room the area has.
 * The measure and the restore happen in one synchronous pass, so nothing is
 * ever painted at the temporary height.
 *
 * Returns pixels, or undefined while not enabled / not measured yet.
 */
export function useFillHeight(areaRef: RefObject<HTMLElement | null>, { enabled, offset, min, container }: UseFillHeightOptions) {
  const [height, setHeight] = useState<number | undefined>(undefined)

  useIsomorphicLayoutEffect(() => {
    const area = areaRef.current
    if (!enabled || !area) return
    const host = resolve(container)

    const measure = () => {
      const scroller = host ?? document.documentElement
      const screen = host ? host.clientHeight : window.innerHeight
      const before = { height: area.style.height, maxHeight: area.style.maxHeight, minHeight: area.style.minHeight }
      area.style.height = `${screen}px`
      area.style.maxHeight = "none"
      area.style.minHeight = "0"
      // Reading forces layout with the area at exactly one screen tall
      const others = scroller.scrollHeight - screen
      area.style.height = before.height
      area.style.maxHeight = before.maxHeight
      area.style.minHeight = before.minHeight
      const next = Math.max(min, Math.floor(screen - others - offset))
      setHeight((prev) => (prev === next ? prev : next))
    }

    // Measuring is reading the DOM's layout, which only an effect can do
    measure()

    // Re-measure when the screen or anything around the grid changes size: the
    // ancestors up to the page and their children (the grid's own height is
    // fixed by this hook, so it is left out to avoid chasing itself)
    const observer = new ResizeObserver(measure)
    const watched = new Set<Element>([document.documentElement, document.body])
    if (host) watched.add(host)
    for (let node: Element | null = area.parentElement; node; node = node.parentElement) {
      watched.add(node)
      for (const sibling of node.children) watched.add(sibling)
      if (node === (host ?? document.body)) break
    }
    watched.delete(area)
    for (const element of watched) observer.observe(element)
    window.addEventListener("resize", measure)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [areaRef, enabled, offset, min, container])

  return enabled ? height : undefined
}
