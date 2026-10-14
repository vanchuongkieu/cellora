import { cn } from "cn"
import type { DataGridStickyOffset } from "@cellora/core"

import { Skeleton } from "@/components/ui/skeleton"
import { TableCell, TableRow } from "@/components/ui/table"

import { ALIGN_CLASS } from "./data-grid-header-cell"
import { getStickyCell } from "./sticky"
import type { DataGridColumnDef, DataGridSlots } from "./types"

// Varied widths so the placeholder looks like real text (full class strings for Tailwind)
const BAR_WIDTHS = ["w-3/4", "w-1/2", "w-2/3", "w-5/6"] as const

interface DataGridSkeletonRowsProps<TRow> {
  columns: readonly DataGridColumnDef<TRow>[]
  count: number
  stickyOffsets: Record<string, DataGridStickyOffset>
  stickyHeader: boolean
  stickyDivider: boolean
  /** Whether a trailing filler cell is needed (fixed column widths) */
  filler: boolean
  slots?: DataGridSlots<TRow>
}

export function DataGridSkeletonRows<TRow>({ columns, count, stickyOffsets, stickyHeader, stickyDivider, filler, slots }: DataGridSkeletonRowsProps<TRow>) {
  return (
    <>
      {Array.from({ length: count }, (_, rowIndex) => (
        <TableRow key={rowIndex} className="group/row hover:bg-transparent">
          {columns.map((column, columnIndex) => {
            const sticky = getStickyCell({
              offset: stickyOffsets[column.id],
              header: false,
              stickyHeader,
              divider: stickyDivider,
            })
            return (
              <TableCell key={column.id} className={cn(ALIGN_CLASS[column.align ?? "left"].text, sticky.className)} style={sticky.style}>
                {slots?.skeletonCell ? (
                  slots.skeletonCell({ column, rowIndex })
                ) : (
                  <Skeleton
                    className={cn(
                      "h-4",
                      column.align === "center" ? "mx-auto w-4" : "",
                      column.align === "right" ? "ml-auto" : "",
                      column.align === "center" ? "" : BAR_WIDTHS[(rowIndex + columnIndex) % BAR_WIDTHS.length]
                    )}
                  />
                )}
              </TableCell>
            )
          })}
          {filler && <TableCell aria-hidden className="p-0" />}
        </TableRow>
      ))}
    </>
  )
}
