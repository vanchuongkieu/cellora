import type { ReactNode } from "react"
import { cn } from "cn"
import { getHeaderGroupRow, type DataGridStickyOffset } from "@cellora/core"

import { TableHead, TableRow } from "@/components/ui/table"

import { getStickyCell } from "./sticky"
import { useDataGridParts } from "./styling"
import type { DataGridColumnDef, DataGridSlots } from "./types"

export type HeaderRegion = "left" | "mid" | "right"

/** One spanning header cell of a column-group row. */
export interface HeaderGroupCell<TRow> {
  label: string | null
  level: number
  region: HeaderRegion
  columns: readonly DataGridColumnDef<TRow>[]
  /** Index of the first column inside its region's list */
  start: number
  end: number
}

/**
 * Cells of one group row. Pinned and scrolling columns are grouped separately
 * (a spanning cell cannot be both sticky and scrolling).
 */
export function getGroupCells<TRow>(regions: Record<HeaderRegion, readonly DataGridColumnDef<TRow>[]>, level: number): HeaderGroupCell<TRow>[] {
  return (["left", "mid", "right"] as const).flatMap((region) =>
    getHeaderGroupRow(regions[region], level).map((cell) => ({
      label: cell.label,
      level,
      region,
      columns: regions[region].slice(cell.start, cell.end),
      start: cell.start,
      end: cell.end,
    }))
  )
}

/** Sticky offset for a spanning cell: first column on the left, last on the right. */
export function getGroupCellOffset<TRow>(cell: HeaderGroupCell<TRow>, stickyOffsets: Record<string, DataGridStickyOffset>): DataGridStickyOffset | undefined {
  if (cell.region === "mid") return undefined
  const column = cell.region === "left" ? cell.columns[0] : cell.columns[cell.columns.length - 1]
  const offset = stickyOffsets[column.id]
  return offset ? { ...offset, edge: false } : undefined
}

export function renderGroupLabel<TRow>(cell: HeaderGroupCell<TRow>, slots?: DataGridSlots<TRow>): ReactNode {
  if (cell.label === null) return null
  return slots?.headerGroup
    ? slots.headerGroup({
        label: cell.label,
        level: cell.level,
        columns: cell.columns,
      })
    : cell.label
}

interface TableHeaderGroupRowProps<TRow> {
  cells: readonly HeaderGroupCell<TRow>[]
  level: number
  height: number
  stickyHeader: boolean
  stickyOffsets: Record<string, DataGridStickyOffset>
  /** Trailing filler cell (fixed column widths) */
  filler: boolean
  slots?: DataGridSlots<TRow>
}

/** A column-group row of the regular <table> header. */
export function TableHeaderGroupRow<TRow>({ cells, level, height, stickyHeader, stickyOffsets, filler, slots }: TableHeaderGroupRowProps<TRow>) {
  const { classNames, styles, bordered } = useDataGridParts()
  const top = level * height
  const fill = getStickyCell({ header: true, stickyHeader, top })
  return (
    <TableRow>
      {cells.map((cell) => {
        const sticky = getStickyCell({
          offset: getGroupCellOffset(cell, stickyOffsets),
          header: true,
          stickyHeader,
          top,
        })
        return (
          // The user's classes go on the inner box (see DataGridHeaderCell): the
          // sticky cell itself stays opaque
          <TableHead
            key={`${cell.region}-${cell.start}`}
            colSpan={cell.columns.length}
            className={cn("isolate p-0 text-left font-medium", bordered && "border-r", sticky.className)}
            style={{ ...styles.headerGroup, ...sticky.style, height }}
          >
            <div className={cn("flex h-full items-center px-2", classNames.headerGroup)}>
              <div className="truncate">{renderGroupLabel(cell, slots)}</div>
            </div>
          </TableHead>
        )
      })}
      {filler && <th aria-hidden className={`p-0 ${fill.className}`} style={{ ...fill.style, height }} />}
    </TableRow>
  )
}
