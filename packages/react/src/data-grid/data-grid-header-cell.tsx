import type { CSSProperties, DragEvent, KeyboardEvent, ReactNode } from "react"
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, ListFilterIcon } from "lucide-react"
import { cn } from "cn"
import { DEFAULT_MIN_COLUMN_WIDTH } from "@cellora/core"
import type { DataGridStickyOffset } from "@cellora/core"

import { TableHead } from "@/components/ui/table"

import { COLUMN_DRAG_TYPE } from "./data-grid-group-panel"
import { useDataGridParts } from "./styling"
import { getStickyCell } from "./sticky"
import type { DataGridColumnDef, DataGridSlots } from "./types"
import type { DataGridApi } from "./use-data-grid"
import type { useColumnSizing } from "./use-column-sizing"

export const ALIGN_CLASS = {
  left: { text: "text-left", justify: "justify-start" },
  center: { text: "text-center", justify: "justify-center" },
  right: { text: "text-right", justify: "justify-end" },
} as const

const KEYBOARD_RESIZE_STEP = 10

// Full class strings so Tailwind can see them
const HANDLE_BAR = {
  // Faint divider always visible, turns blue on hover / drag / keyboard focus
  always:
    "bg-muted-foreground/30 transition-colors group-hover/resizer:bg-(--chart-2,var(--ring)) group-focus-visible/resizer:bg-(--chart-2,var(--ring)) group-active/resizer:bg-(--chart-2,var(--ring))",
  // Hidden until the handle is hovered, dragged or focused
  hover: "bg-(--chart-2,var(--ring)) opacity-0 transition-opacity group-hover/resizer:opacity-100 group-focus-visible/resizer:opacity-100 group-active/resizer:opacity-100",
} as const

export type DataGridResizeHandle = keyof typeof HANDLE_BAR

/**
 * Width that makes the header content fit without truncation, measured from
 * the real DOM (so custom `headerCell`s and slots are respected).
 */
function measureHeaderFit(handle: HTMLElement): number | null {
  const cell = handle.closest('[data-slot="data-grid-header-cell"]')
  const row = cell?.querySelector<HTMLElement>('[data-slot="data-grid-header-row"]')
  if (!cell || !row) return null
  // The inner box carries the padding, so its max-content width is the whole fit
  const previous = row.style.width
  row.style.width = "max-content"
  const natural = row.getBoundingClientRect().width
  row.style.width = previous
  return Math.ceil(natural)
}

/**
 * Width that fits the widest content among this column's rendered cells (what
 * double-click fit is about). Measured from the real layout: the extent of the
 * cell's text and inline parts, plus the cell's own horizontal padding. Content
 * that is clipped with `truncate` still counts at its full length.
 */
function measureCellsFit(handle: HTMLElement, columnId: string): number | null {
  const scroll = handle.closest('[data-slot="data-grid-scroll"]')
  const cells = scroll?.querySelectorAll<HTMLElement>(`[data-column-id="${CSS.escape(columnId)}"]`)
  if (!cells || cells.length === 0) return null
  const range = document.createRange()
  let widest = 0
  for (const cell of cells) {
    let left = Infinity
    let right = -Infinity
    const include = (rect: DOMRect) => {
      if (rect.width === 0 && rect.height === 0) return
      left = Math.min(left, rect.left)
      right = Math.max(right, rect.right)
    }
    // Text by its own box (a clipped line keeps its full width), elements without children as they are
    const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.nodeType === Node.TEXT_NODE) {
        if (!node.textContent?.trim()) continue
        range.selectNodeContents(node)
        include(range.getBoundingClientRect())
      } else if ((node as Element).childElementCount === 0 && !(node as Element).textContent) {
        include((node as Element).getBoundingClientRect())
      }
    }
    if (right < left) continue
    const style = getComputedStyle(cell)
    const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
    widest = Math.max(widest, right - left + padding)
  }
  range.detach()
  // A pixel of slack: sub-pixel text widths must not tip into an ellipsis
  return widest > 0 ? Math.ceil(widest) + 1 : null
}

/** What double-click on the resize handle fits the column to. */
export type DataGridAutoFit = "cells" | "header" | "both"

interface DataGridHeaderCellProps<TRow> {
  /**
   * "table" renders a <th>; "grid" renders a div (virtualized layout) sized by
   * the column width.
   */
  variant?: "table" | "grid"
  column: DataGridColumnDef<TRow>
  grid: DataGridApi<TRow>
  sizing: ReturnType<typeof useColumnSizing>
  slots?: DataGridSlots<TRow>
  canSort: boolean
  canResize: boolean
  resizeHandle: DataGridResizeHandle
  resizeHandleClassName?: string
  resizeHandleStyle?: CSSProperties
  /** Double-click the resize handle to fit the column: true / "cells", "header" or "both". */
  autoFitOnDoubleClick: boolean | DataGridAutoFit
  stickyHeader: boolean
  /** Where the sticky header sticks; below any column-group rows above it */
  stickyTop?: number
  stickyDivider: boolean
  stickyOffset?: DataGridStickyOffset
  /** The column menu control, or null when this column has none */
  menu: ReactNode
  /** aria-label of the resize handle */
  resizeLabel: string
  /** Let the header be dragged (onto the group-by bar) */
  draggable?: boolean
}

export function DataGridHeaderCell<TRow>({
  variant = "table",
  column,
  grid,
  sizing,
  slots,
  canSort,
  canResize,
  resizeHandle,
  resizeHandleClassName,
  resizeHandleStyle,
  autoFitOnDoubleClick,
  stickyHeader,
  stickyTop = 0,
  stickyDivider,
  stickyOffset,
  menu,
  resizeLabel,
  draggable = false,
}: DataGridHeaderCellProps<TRow>) {
  const { classNames, styles, bordered } = useDataGridParts()
  const sorted = grid.state.sort?.columnId === column.id ? grid.state.sort.direction : null
  const filtered = Boolean(grid.state.columnFilters[column.id])
  const width = sizing.getWidth(column)
  const align = ALIGN_CLASS[column.align ?? "left"]
  const sticky = getStickyCell({
    offset: stickyOffset,
    header: true,
    stickyHeader,
    divider: stickyDivider,
    top: stickyTop,
  })

  const DefaultSortIcon = sorted === "asc" ? ArrowUpIcon : sorted === "desc" ? ArrowDownIcon : ArrowUpDownIcon
  const label = column.headerCell ? column.headerCell({ column, sorted, grid }) : column.header

  // Without a menu button there is nothing else to Tab to, so keep sorting
  // reachable from the keyboard on the header itself (no heavy focus ring).
  const keyboardSort = canSort && !menu

  const rootProps = {
    "data-slot": "data-grid-header-cell",
    // (user styles first: sticky offsets and widths must keep working)
    style: variant === "grid" ? { ...styles.headerCell, ...sticky.style, width, flex: "none" as const } : { ...styles.headerCell, ...sticky.style },
    "aria-sort": sorted === "asc" ? ("ascending" as const) : sorted === "desc" ? ("descending" as const) : undefined,
    draggable: draggable || undefined,
    onDragStart: draggable
      ? (event: DragEvent<HTMLElement>) => {
          event.dataTransfer.setData(COLUMN_DRAG_TYPE, column.id)
          event.dataTransfer.effectAllowed = "copy"
        }
      : undefined,
    onClick: canSort ? () => grid.toggleSort(column.id) : undefined,
    tabIndex: keyboardSort ? 0 : undefined,
    onKeyDown: keyboardSort
      ? (event: KeyboardEvent<HTMLElement>) => {
          // Ignore keys bubbling up from children
          if (event.target !== event.currentTarget) return
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            grid.toggleSort(column.id)
          }
        }
      : undefined,
  }
  // The cell itself keeps the opaque sticky background and no padding; the
  // user's `classNames.headerCell` goes on the inner box that fills the cell.
  // A translucent tint there (bg-muted/50) sits on top of the opaque base, so
  // a pinned or sticky header never lets scrolled content show through.
  const rootClassName = cn(
    !sticky.className && "relative",
    "p-0",
    align.text,
    sticky.className,
    canSort && "cursor-pointer select-none",
    keyboardSort && "outline-none focus-visible:bg-muted/50",
    // Bordered: the resize handle sits on the border, half over the next header cell, so a hovered
    // header rises above its neighbours (still under pinned headers) to keep the handle on top
    bordered && "border-r hover:z-29 focus-within:z-29"
  )

  const content = (
    <>
      <div data-slot="data-grid-header-row" className={cn("flex h-full w-full items-center gap-1 px-2", classNames.headerCell)}>
        <div className={cn("flex min-w-0 flex-1 items-center gap-1.5", align.justify)}>
          <span className="truncate">{label}</span>
          {filtered && <ListFilterIcon className="size-3.5 shrink-0 text-muted-foreground" />}
          {canSort && (slots?.sortIcon ? slots.sortIcon(sorted) : <DefaultSortIcon className={cn("size-4 shrink-0", !sorted && "text-muted-foreground")} />)}
        </div>
        {menu && <div className="shrink-0">{menu}</div>}
      </div>
      {canResize && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={resizeLabel}
          aria-valuenow={width}
          aria-valuemin={column.minWidth ?? DEFAULT_MIN_COLUMN_WIDTH}
          // ARIA defaults valuemax to 100, so give an open-ended column a generous cap
          aria-valuemax={column.maxWidth ?? Math.max(width, 1200)}
          tabIndex={0}
          onPointerDown={(event) => sizing.startResize(event, column)}
          // A drag or double-click on the handle must not sort the column
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={
            autoFitOnDoubleClick
              ? (event) => {
                  event.stopPropagation()
                  const mode: DataGridAutoFit = autoFitOnDoubleClick === true ? "cells" : autoFitOnDoubleClick
                  const fits = [mode !== "header" ? measureCellsFit(event.currentTarget, column.id) : null, mode !== "cells" ? measureHeaderFit(event.currentTarget) : null].filter(
                    (fit) => fit !== null
                  )
                  // Nothing to measure in the cells (no rows): fall back to the header
                  const fit = fits.length > 0 ? Math.max(...fits) : measureHeaderFit(event.currentTarget)
                  if (fit !== null) sizing.resizeTo(column, fit)
                }
              : undefined
          }
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") sizing.resizeTo(column, width - KEYBOARD_RESIZE_STEP)
            else if (event.key === "ArrowRight") sizing.resizeTo(column, width + KEYBOARD_RESIZE_STEP)
            else return
            event.preventDefault()
          }}
          className={cn("group/resizer absolute inset-y-0 right-0 flex w-2 cursor-col-resize touch-none justify-end outline-none select-none", bordered && "-right-px")}
        >
          {slots?.resizeHandle ? (
            slots.resizeHandle({ column, width })
          ) : (
            <span
              className={cn(
                // Bordered: the column border is the divider. The bar sits right on it,
                // full height, and only lights up on hover / drag (no second line beside it)
                bordered ? ["h-full w-px", HANDLE_BAR.hover] : ["h-6 w-px self-center rounded-full", HANDLE_BAR[resizeHandle]],
                resizeHandleClassName
              )}
              style={resizeHandleStyle}
            />
          )}
        </div>
      )}
    </>
  )

  return variant === "grid" ? (
    <div role="columnheader" {...rootProps} className={cn("flex h-full items-center font-medium whitespace-nowrap text-foreground", rootClassName)}>
      {content}
    </div>
  ) : (
    <TableHead {...rootProps} className={rootClassName}>
      {content}
    </TableHead>
  )
}
