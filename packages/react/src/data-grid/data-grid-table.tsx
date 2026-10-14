import { Fragment, type ReactNode } from "react"
import { cn } from "cn"
import type { DataGridStickyOffset } from "@cellora/core"

import { TableBody, TableCell, TableFooter, TableHeader, TableRow } from "@/components/ui/table"

import { EDITABLE_CELL_CLASS, getCellEditProps, renderCellContent } from "./data-grid-cell-content"
import { renderGroupCellContent, renderTotalCellContent } from "./data-grid-group-cells"
import { ALIGN_CLASS } from "./data-grid-header-cell"
import { getGroupCells, TableHeaderGroupRow, type HeaderRegion } from "./data-grid-header-groups"
import { DataGridSkeletonRows } from "./data-grid-skeleton-rows"
import { useDataGridParts } from "./styling"
import { getStickyCell, getStickyFooterCell } from "./sticky"
import type { DataGridColumnDef, DataGridLabels, DataGridSlots } from "./types"
import type { useColumnSizing } from "./use-column-sizing"
import type { DataGridApi } from "./use-data-grid"

interface DataGridTableProps<TRow> {
  grid: DataGridApi<TRow>
  /** Every column in render order (checkbox column included) */
  columns: readonly DataGridColumnDef<TRow>[]
  regions: Record<HeaderRegion, readonly DataGridColumnDef<TRow>[]>
  sizing: ReturnType<typeof useColumnSizing>
  stickyOffsets: Record<string, DataGridStickyOffset>
  stickyHeader: boolean
  stickyDivider: boolean
  fixedColumnWidths: boolean
  totalWidth: number
  /** Number of column-group rows above the column headers */
  headerGroupDepth: number
  headerGroupHeight: number
  renderHeaderCell: (column: DataGridColumnDef<TRow>) => ReactNode
  labels: DataGridLabels
  slots?: DataGridSlots<TRow>
  rowClassName?: (row: TRow, index: number) => string | undefined
  getRowId?: (row: TRow, index: number) => string
  selectionEnabled: boolean
  skeleton: boolean
  skeletonRows: number
  emptyContent: ReactNode
  /** Column that carries group labels and the "Total" text */
  labelColumnId?: string
  groupIndent: number
  hideGroupedCells: boolean
  showFooterRow: boolean
}

/** The regular <table> rendering (not virtualized). */
export function DataGridTable<TRow>({
  grid,
  columns,
  regions,
  sizing,
  stickyOffsets,
  stickyHeader,
  stickyDivider,
  fixedColumnWidths,
  totalWidth,
  headerGroupDepth,
  headerGroupHeight,
  renderHeaderCell,
  labels,
  slots,
  rowClassName,
  getRowId,
  selectionEnabled,
  skeleton,
  skeletonRows,
  emptyContent,
  labelColumnId,
  groupIndent,
  hideGroupedCells,
  showFooterRow,
}: DataGridTableProps<TRow>) {
  const { classNames, styles, bordered, rowClickable, cellClickable } = useDataGridParts()
  const filler = fixedColumnWidths
  const fillerHead = getStickyCell({
    header: true,
    stickyHeader,
    top: headerGroupDepth * headerGroupHeight,
  })
  const items = grid.pageItems ?? grid.result.rows.map((row) => ({ kind: "row" as const, row, depth: 0 }))
  const groupedIds = new Set(grid.groupBy)
  // The pinned edge cell must not clip (its shadow sits outside it): its
  // content truncates in a child instead
  const cellContent = (edge: boolean, content: ReactNode) => (edge && fixedColumnWidths ? <div className="truncate">{content}</div> : content)
  const cellClass = (column: DataGridColumnDef<TRow>, extra: string, edge = false, clickable = false) =>
    cn(
      // isolate: a z-index inside a cell stays inside it
      "isolate",
      fixedColumnWidths && !edge && "truncate",
      ALIGN_CLASS[column.align ?? "left"].text,
      bordered && "border-r",
      clickable && cellClickable && "cursor-pointer",
      extra,
      classNames.cell
    )

  return (
    <table
      data-slot="table"
      // border-collapse is set here, not left to Tailwind's Preflight: row borders
      // (and the 37px rows) must not depend on the host page's CSS reset
      className={cn("w-full caption-bottom border-collapse text-sm", fixedColumnWidths && "table-fixed", classNames.table)}
      style={fixedColumnWidths ? { ...styles.table, width: "100%", minWidth: totalWidth } : styles.table}
    >
      {fixedColumnWidths && (
        <colgroup>
          {columns.map((column) => (
            <col key={column.id} style={{ width: sizing.getWidth(column) }} />
          ))}
          {/* Width-less filler column soaks up spare space so fixed columns never stretch */}
          <col />
        </colgroup>
      )}
      {/* Sticky header cells draw their own bottom line (it must travel with
          them), so drop the row border to avoid a double line */}
      <TableHeader className={cn(stickyHeader && "[&_tr]:border-b-0", classNames.header)} style={styles.header}>
        {Array.from({ length: headerGroupDepth }, (_, level) => (
          <TableHeaderGroupRow
            key={level}
            cells={getGroupCells(regions, level)}
            level={level}
            height={headerGroupHeight}
            stickyHeader={stickyHeader}
            stickyOffsets={stickyOffsets}
            filler={filler}
            slots={slots}
          />
        ))}
        <TableRow className={classNames.headerRow} style={styles.headerRow}>
          {columns.map(renderHeaderCell)}
          {filler && <th aria-hidden className={cn("p-0", fillerHead.className)} style={fillerHead.style} />}
        </TableRow>
      </TableHeader>

      <TableBody>
        {skeleton ? (
          <DataGridSkeletonRows
            columns={columns}
            count={skeletonRows}
            stickyOffsets={stickyOffsets}
            stickyHeader={stickyHeader}
            stickyDivider={stickyDivider}
            filler={filler}
            slots={slots}
          />
        ) : items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length + (filler ? 1 : 0)} className={cn("h-24 p-0 text-center text-muted-foreground", classNames.empty)} style={styles.empty}>
              {/* sticky + 100cqw: centred in the visible area, not in the whole table */}
              <div className="sticky left-0 flex h-full items-center justify-center" style={{ width: "100cqw" }}>
                {emptyContent}
              </div>
            </TableCell>
          </TableRow>
        ) : (
          items.map((item, index) => {
            if (item.kind === "group") {
              const toggle = () => grid.toggleGroup(item.key)
              const cells = (
                <>
                  {columns.map((column) => {
                    const sticky = getStickyCell({
                      offset: stickyOffsets[column.id],
                      header: false,
                      stickyHeader,
                      divider: stickyDivider,
                      group: true,
                    })
                    return (
                      <TableCell
                        key={column.id}
                        data-column-id={column.id}
                        className={cellClass(column, sticky.className, sticky.edge)}
                        style={{ ...styles.cell, ...sticky.style }}
                      >
                        {cellContent(
                          sticky.edge,
                          renderGroupCellContent(item, {
                            column,
                            isLabelColumn: column.id === labelColumnId,
                            grid,
                            labels,
                            slots,
                            indent: groupIndent,
                          })
                        )}
                      </TableCell>
                    )
                  })}
                  {filler && <TableCell aria-hidden className="p-0" />}
                </>
              )
              return (
                <Fragment key={item.key}>
                  {slots?.groupRow ? (
                    slots.groupRow({ group: item, cells, toggle })
                  ) : (
                    <TableRow
                      data-slot="data-grid-group-row"
                      aria-expanded={item.expanded}
                      onClick={toggle}
                      className={cn("group/row cursor-pointer bg-muted/30 font-medium hover:bg-muted/50", classNames.groupRow)}
                      style={styles.groupRow}
                    >
                      {cells}
                    </TableRow>
                  )}
                </Fragment>
              )
            }

            const { row } = item
            const selected = selectionEnabled && grid.selection.isSelected(row)
            const cells = (
              <>
                {columns.map((column) => {
                  const content = renderCellContent({
                    row,
                    column,
                    index,
                    grid,
                    labels,
                    slots,
                    hidden: hideGroupedCells && groupedIds.has(column.id),
                  })
                  const sticky = getStickyCell({
                    offset: stickyOffsets[column.id],
                    header: false,
                    stickyHeader,
                    divider: stickyDivider,
                  })
                  return (
                    <TableCell
                      key={column.id}
                      data-column-id={column.id}
                      className={cellClass(column, `${EDITABLE_CELL_CLASS} ${sticky.className}`, sticky.edge, true)}
                      style={{ ...styles.cell, ...sticky.style }}
                      title={typeof content === "string" ? content : undefined}
                      {...getCellEditProps(grid, row, column, index)}
                    >
                      {cellContent(sticky.edge, content)}
                    </TableCell>
                  )
                })}
                {filler && <TableCell aria-hidden className="p-0" />}
              </>
            )
            return (
              <Fragment key={getRowId ? getRowId(row, index) : index}>
                {slots?.row ? (
                  slots.row({ row, index, selected, cells })
                ) : (
                  <TableRow
                    className={cn("group/row", rowClickable && "cursor-pointer", rowClassName?.(row, index), classNames.row)}
                    style={styles.row}
                    data-row-index={index}
                    data-state={selected ? "selected" : undefined}
                  >
                    {cells}
                  </TableRow>
                )}
              </Fragment>
            )
          })
        )}
      </TableBody>

      {showFooterRow && (
        <TableFooter className="border-t-0 bg-transparent [&>tr]:border-b-0">
          {(() => {
            const cells = (
              <>
                {columns.map((column) => {
                  const sticky = getStickyFooterCell(stickyOffsets[column.id])
                  return (
                    <TableCell key={column.id} className={cellClass(column, sticky.className, sticky.edge)} style={{ ...styles.cell, ...sticky.style }}>
                      {cellContent(
                        sticky.edge,
                        renderTotalCellContent(grid.totals, {
                          column,
                          isLabelColumn: column.id === labelColumnId,
                          grid,
                          labels,
                          slots,
                          indent: groupIndent,
                        })
                      )}
                    </TableCell>
                  )
                })}
                {filler && <TableCell aria-hidden className="sticky bottom-0 z-20 bg-background p-0 shadow-[inset_0_1px_0_var(--border)]" style={{ bottom: 0 }} />}
              </>
            )
            return slots?.footerRow ? (
              slots.footerRow({ totals: grid.totals, cells })
            ) : (
              <TableRow data-slot="data-grid-total-row" className={cn("hover:bg-transparent", classNames.footerRow)} style={styles.footerRow}>
                {cells}
              </TableRow>
            )
          })()}
        </TableFooter>
      )}
    </table>
  )
}
