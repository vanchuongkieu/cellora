import { useEffect, useState, type RefObject } from "react"

interface UseStablePageHeightOptions {
  /** Only worth doing while there is more than one page */
  enabled: boolean
  pageSize: number
  /** Rows on the page being shown */
  rowCount: number
  /** Anything that makes earlier measurements wrong (columns, grouping, ...) */
  resetKey: string
  /** Height cap of the scroll area, as given to the grid; null/undefined for none */
  maxHeight: number | string | null | undefined
}

/**
 * Keeps the scroll area as tall as a full page, so a short last page does not
 * shrink the table (and push everything below it up).
 *
 * The height of a full page is the table with `pageSize` rows: measured from
 * the rows on screen, so it works from whichever page is shown first. The
 * result is applied as `min-height`, capped by `maxHeight` (a table already
 * taller than its cap scrolls, so the cap is what a full page looks like).
 *
 * Returns the `min-height` CSS value, or undefined while there is nothing to keep.
 */
export function useStablePageHeight(containerRef: RefObject<HTMLElement | null>, { enabled, pageSize, rowCount, resetKey, maxHeight }: UseStablePageHeightOptions) {
  const key = `${enabled}|${pageSize}|${resetKey}`
  // Measurements belong to one key; a new key starts from scratch without an effect to reset
  const [measured, setMeasured] = useState<{ key: string; height: number }>({ key, height: 0 })

  useEffect(() => {
    const element = containerRef.current
    const table = element?.querySelector("table")
    if (!enabled || !element || !table) return
    const measure = () => {
      const body = table.querySelector("tbody")
      if (!body) return
      const tableHeight = table.getBoundingClientRect().height
      const bodyHeight = body.getBoundingClientRect().height
      // Borders and the horizontal scrollbar around the table
      const frame = element.offsetHeight - element.clientHeight
      // A short page: stretch its rows to a full page's worth
      const full = rowCount > 0 && rowCount < pageSize ? tableHeight - bodyHeight + (bodyHeight / rowCount) * pageSize : tableHeight
      const height = Math.ceil(full + frame)
      setMeasured((prev) => (prev.key === key && prev.height >= height ? prev : { key, height: Math.max(height, prev.key === key ? prev.height : 0) }))
    }
    const observer = new ResizeObserver(measure)
    observer.observe(table)
    observer.observe(element)
    return () => observer.disconnect()
  }, [containerRef, enabled, key, pageSize, rowCount])

  if (!enabled || measured.key !== key || measured.height <= 0) return undefined
  const cap = maxHeight === null || maxHeight === undefined ? undefined : typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight
  return cap ? `min(${measured.height}px, ${cap})` : `${measured.height}px`
}
