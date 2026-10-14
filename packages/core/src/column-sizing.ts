import type { DataGridColumn } from "./types"

export const DEFAULT_COLUMN_WIDTH = 160
export const DEFAULT_MIN_COLUMN_WIDTH = 60

/** User-resized widths in px, keyed by column id. */
export type DataGridColumnSizes = Record<string, number>

type SizedColumn = Pick<DataGridColumn, "id" | "width" | "minWidth" | "maxWidth">

export function clampColumnWidth(column: SizedColumn, width: number): number {
  const min = column.minWidth ?? DEFAULT_MIN_COLUMN_WIDTH
  const max = column.maxWidth ?? Number.POSITIVE_INFINITY
  return Math.round(Math.min(Math.max(width, min), max))
}

/** Resolved width: user-resized value, else column.width, else the default. */
export function getColumnWidth(column: SizedColumn, sizes: DataGridColumnSizes): number {
  return clampColumnWidth(column, sizes[column.id] ?? column.width ?? DEFAULT_COLUMN_WIDTH)
}

export function setColumnWidth(sizes: DataGridColumnSizes, column: SizedColumn, width: number): DataGridColumnSizes {
  return { ...sizes, [column.id]: clampColumnWidth(column, width) }
}

export interface DataGridStickyOffset {
  side: "left" | "right"
  /** px distance from that side of the scroll container */
  offset: number
  /** Innermost pinned column on its side (draws the divider shadow) */
  edge: boolean
}

/**
 * Offsets for pinned columns, derived from resolved widths.
 * Left pins stack in column order, right pins stack from the last column inwards.
 */
export function getStickyOffsets(columns: readonly (SizedColumn & Pick<DataGridColumn, "sticky">)[], sizes: DataGridColumnSizes): Record<string, DataGridStickyOffset> {
  const result: Record<string, DataGridStickyOffset> = {}

  const stack = (ordered: readonly (SizedColumn & Pick<DataGridColumn, "sticky">)[], side: "left" | "right") => {
    const pinned = ordered.filter((column) => column.sticky === side)
    let offset = 0
    pinned.forEach((column, index) => {
      result[column.id] = { side, offset, edge: index === pinned.length - 1 }
      offset += getColumnWidth(column, sizes)
    })
  }
  stack(columns, "left")
  stack([...columns].reverse(), "right")
  return result
}
