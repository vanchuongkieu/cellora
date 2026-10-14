import { useEffect, type RefObject } from "react"

/**
 * Marks the scroll area while content is hidden behind a pinned column, so the
 * pinned edge can show a shadow only then:
 *
 * - `data-scrolled-start`: scrolled away from the left edge (left pin overlaps)
 * - `data-scrolled-end`: more content to the right (right pin overlaps)
 *
 * Plain attributes set straight on the element: no React render per scroll
 * event, and an attribute only changes when the answer does.
 */
export function usePinnedShadow(
  containerRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  /** Changes when the scrolling content is swapped (table <-> virtual grid) */
  contentKey?: unknown
) {
  useEffect(() => {
    const element = containerRef.current
    if (!enabled || !element) return
    const toggle = (name: string, on: boolean) => {
      if (on === element.hasAttribute(name)) return
      if (on) element.setAttribute(name, "")
      else element.removeAttribute(name)
    }
    const update = () => {
      // 1px tolerance: scroll positions are fractional on scaled displays
      toggle("data-scrolled-start", element.scrollLeft > 1)
      toggle("data-scrolled-end", element.scrollLeft + element.clientWidth < element.scrollWidth - 1)
    }
    update()
    element.addEventListener("scroll", update, { passive: true })
    // The viewport or the content (column resize, pin, hide) changed size
    const observer = new ResizeObserver(update)
    observer.observe(element)
    if (element.firstElementChild) observer.observe(element.firstElementChild)
    return () => {
      element.removeEventListener("scroll", update)
      observer.disconnect()
      element.removeAttribute("data-scrolled-start")
      element.removeAttribute("data-scrolled-end")
    }
  }, [containerRef, enabled, contentKey])
}
