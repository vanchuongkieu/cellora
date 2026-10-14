import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { useDataGridParts } from "./styling"
import type { DataGridLabels, DataGridSlots } from "./types"
import type { DataGridApi } from "./use-data-grid"

interface DataGridFooterProps<TRow> {
  grid: DataGridApi<TRow>
  pageSizeOptions: readonly number[]
  labels: DataGridLabels
  /** Show the "x selected" summary */
  showSelection: boolean
  /** Show paging controls; when false only the summaries are left */
  showPagination: boolean
  /** Show "N rows" (used instead of the range when virtualized) */
  showRowCount: boolean
  /** Rows are still loading (skeleton): show placeholders instead of counts */
  loading?: boolean
  slots?: DataGridSlots<TRow>
}

export function DataGridFooter<TRow>({ grid, pageSizeOptions, labels, showSelection, showPagination, showRowCount, loading = false, slots }: DataGridFooterProps<TRow>) {
  const { classNames, styles } = useDataGridParts()
  if (slots?.footer) return <>{slots.footer(grid)}</>

  const { state, result } = grid
  const from = result.total === 0 ? 0 : result.pageIndex * state.pageSize + 1
  const to = Math.min((result.pageIndex + 1) * state.pageSize, result.total)
  // The select can only show a value it lists: keep the current size among the choices
  const sizeOptions = pageSizeOptions.includes(state.pageSize) ? pageSizeOptions : [...pageSizeOptions, state.pageSize].sort((a, b) => a - b)

  const selectionSummary = showSelection ? (
    <span>
      {slots?.selectionSummary
        ? slots.selectionSummary({
            selectedRowIds: grid.selection.selectedRowIds,
            selectedRows: grid.selection.selectedRows,
            count: grid.selection.count,
            total: result.total,
          })
        : labels.selected(grid.selection.count)}
    </span>
  ) : null

  return (
    // A container query root: in a narrow grid (phones) the paging controls take
    // their own full-width line and spread out, and the "Rows per page" label
    // steps aside for the select, so nothing wraps mid-phrase
    <div data-slot="data-grid-footer" className={cn("@container text-sm text-muted-foreground", classNames.footer)} style={styles.footer}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 whitespace-nowrap">
          {loading && (showPagination || showRowCount) ? (
            // Counts are unknown until the rows arrive; "0-0 of 0" would be a lie
            <Skeleton className="h-4 w-24" />
          ) : (
            <>
              {showPagination && <span>{slots?.range ? slots.range({ from, to, total: result.total }) : labels.range(from, to, result.total)}</span>}
              {!showPagination && showRowCount && <span>{slots?.rowCount ? slots.rowCount({ total: result.total }) : labels.rowCount(result.total)}</span>}
            </>
          )}
          {selectionSummary}
        </div>
        {showPagination && (
          <div className="flex items-center gap-3 whitespace-nowrap @max-md:w-full @max-md:justify-between">
            <div className="flex items-center gap-2">
              {slots?.pageSize ? (
                slots.pageSize({
                  pageSize: state.pageSize,
                  options: sizeOptions,
                  onChange: grid.setPageSize,
                })
              ) : (
                <>
                  <span className="@max-sm:sr-only">{labels.rowsPerPage}</span>
                  <Select value={String(state.pageSize)} onValueChange={(value) => grid.setPageSize(Number(value))}>
                    <SelectTrigger size="sm" aria-label={labels.rowsPerPage}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sizeOptions.map((option) => (
                        <SelectItem key={option} value={String(option)}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>
            <span>
              {slots?.pageIndicator
                ? slots.pageIndicator({
                    pageIndex: result.pageIndex,
                    pageCount: result.pageCount,
                  })
                : labels.pageIndicator(result.pageIndex + 1, result.pageCount)}
            </span>
            <div className="flex items-center gap-2">
              {slots?.pageNavigation ? (
                slots.pageNavigation({
                  pageIndex: result.pageIndex,
                  pageCount: result.pageCount,
                  onPageChange: grid.setPageIndex,
                })
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label={labels.previousPage}
                    disabled={loading || result.pageIndex === 0}
                    onClick={() => grid.setPageIndex(result.pageIndex - 1)}
                  >
                    <ChevronLeftIcon />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label={labels.nextPage}
                    disabled={loading || result.pageIndex >= result.pageCount - 1}
                    onClick={() => grid.setPageIndex(result.pageIndex + 1)}
                  >
                    <ChevronRightIcon />
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
