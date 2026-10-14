import type { DataGridColumn } from "./types"

/** A header cell spanning columns [start, end) of the list it was built from. */
export interface DataGridHeaderGroupCell {
  /** Group label, or null for a blank cell (columns without a group here) */
  label: string | null
  start: number
  end: number
}

type Grouped = Pick<DataGridColumn, "headerGroup">

const pathOf = (column: Grouped): readonly string[] => (column.headerGroup === undefined ? [] : typeof column.headerGroup === "string" ? [column.headerGroup] : column.headerGroup)

/** How many group rows sit above the column headers (0 = no groups). */
export function getHeaderGroupDepth(columns: readonly Grouped[]): number {
  let depth = 0
  for (const column of columns) depth = Math.max(depth, pathOf(column).length)
  return depth
}

/**
 * Cells of one group row. Neighbours merge when they share the label here
 * AND every label above (so "A > x" and "B > x" never merge). Columns with no
 * label at this level merge into blank cells.
 */
export function getHeaderGroupRow(columns: readonly Grouped[], level: number): DataGridHeaderGroupCell[] {
  const cells: DataGridHeaderGroupCell[] = []
  let previous: readonly string[] | null = null
  for (let index = 0; index < columns.length; index++) {
    const path = pathOf(columns[index])
    const label = path[level] ?? null
    const last = cells[cells.length - 1]
    const sameBranch = previous !== null && last !== undefined && last.label === label && path.slice(0, level).every((part, i) => part === previous![i])
    if (sameBranch) last.end = index + 1
    else cells.push({ label, start: index, end: index + 1 })
    previous = path
  }
  return cells
}
