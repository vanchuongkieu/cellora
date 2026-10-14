import { memo, useMemo, type CSSProperties, type ReactNode, type RefObject } from "react"
import type { DataGridGroupItem, DataGridStickyOffset, VirtualRowMetrics } from "@cellora/core"

import { cn } from "cn"

import { Skeleton } from "@/components/ui/skeleton"

import { EDITABLE_CELL_CLASS, getCellEditProps, renderCellContent } from "./data-grid-cell-content"
import { renderGroupCellContent, renderTotalCellContent } from "./data-grid-group-cells"
import { ALIGN_CLASS } from "./data-grid-header-cell"
import { getGroupCellOffset, getGroupCells, renderGroupLabel, type HeaderGroupCell, type HeaderRegion } from "./data-grid-header-groups"
import { getStickyCell } from "./sticky"
import { useDataGridParts } from "./styling"
import type { DataGridColumnDef, DataGridLabels, DataGridSlots } from "./types"
import type { useColumnSizing } from "./use-column-sizing"
import type { DataGridApi, DataGridDisplay } from "./use-data-grid"
import type { VirtualWindow } from "./use-virtual-grid"

interface DataGridVirtualBodyProps<TRow> {
  grid: DataGridApi<TRow>
  /** Every line (group header or row); only a window of it is rendered */
  display: DataGridDisplay<TRow>
  /** Left-pinned, scrolling and right-pinned columns, in render order */
  leftColumns: readonly DataGridColumnDef<TRow>[]
  midColumns: readonly DataGridColumnDef<TRow>[]
  rightColumns: readonly DataGridColumnDef<TRow>[]
  /** Prefix sums of `midColumns` widths */
  columnOffsets: readonly number[]
  totalWidth: number
  sizing: ReturnType<typeof useColumnSizing>
  stickyOffsets: Record<string, DataGridStickyOffset>
  stickyDivider: boolean
  window: VirtualWindow
  metrics: VirtualRowMetrics
  bodyRef: RefObject<HTMLDivElement | null>
  /** The skeleton overlay element (the hook hides it while flinging) */
  placeholderRef: RefObject<HTMLDivElement | null>
  rowHeight: number
  headerHeight: number
  /** Number of column-group rows above the column headers */
  headerGroupDepth: number
  headerGroupHeight: number
  renderHeaderCell: (column: DataGridColumnDef<TRow>) => ReactNode
  labels: DataGridLabels
  /** Column that carries group labels and the "Total" text */
  labelColumnId?: string
  groupIndent: number
  hideGroupedCells: boolean
  showFooterRow: boolean
  selectionEnabled: boolean
  skeleton: boolean
  rowClassName?: (row: TRow, index: number) => string | undefined
  getRowKey?: (row: TRow, index: number) => string
  emptyContent: ReactNode
  columnCount: number
  /**
   * What unrendered areas look like when a scroll outruns the rendered rows:
   * grey skeleton bars per column, plain row lines, or nothing.
   */
  placeholder: DataGridVirtualPlaceholder
  slots?: DataGridSlots<TRow>
}

export type DataGridVirtualPlaceholder = "skeleton" | "lines" | "none"

type CellMode = "row" | "group" | "total" | "skeleton"

/** Everything about a column's cell that does not depend on the row. */
interface CellSpec<TRow> {
  column: DataGridColumnDef<TRow>
  position: number
  className: string
  style: CSSProperties
  contentClassName: string
  /** Plain-text cells are a single element: no wrapper, line-height centers */
  textClassName: string
  textStyle: CSSProperties
  /** Innermost pinned column: wrapper path, cell itself must not clip */
  edge: boolean
}

/** Settings shared by all rows; one stable object so memoized rows can compare it. */
interface RowSettings {
  labels: DataGridLabels
  labelColumnId?: string
  groupIndent: number
  hideGroupedCells: boolean
  groupBy: readonly string[]
  /** Body cells react to clicks (pointer cursor) */
  cellClickable: boolean
  /** aria-rowindex of the first body row (header rows come first, from 1) */
  firstRowIndex: number
}

/**
 * Cell specs cached per column object, so rows get identical references while
 * nothing about the column changed (which is what lets memoized rows skip work).
 * Module level on purpose: keyed by the column, valid for any grid.
 */
const SPEC_CACHE = {
  row: new WeakMap<object, { key: string; spec: unknown }>(),
  group: new WeakMap<object, { key: string; spec: unknown }>(),
}

const BAR_WIDTHS = ["w-3/4", "w-1/2", "w-2/3", "w-5/6"] as const
// Header gaps (hidden columns, filler) must be opaque and carry the same
// bottom line as the header cells
const HEADER_GAP = "relative z-20 bg-background shadow-[inset_0_-1px_0_var(--border)]"
// Rows are opaque (tints are mixed colors, not transparent ones) so the
// placeholder skeleton drawn behind never shows through a rendered row
const ROW_CLASS = "group/row flex border-b bg-background transition-colors hover:bg-[color-mix(in_oklch,var(--background),var(--muted)_50%)] data-[state=selected]:bg-muted"
const GROUP_ROW_CLASS =
  "group/row flex cursor-pointer border-b bg-[color-mix(in_oklch,var(--background),var(--muted)_30%)] font-medium transition-colors hover:bg-[color-mix(in_oklch,var(--background),var(--muted)_50%)]"
const SKELETON_BAR_HEIGHT = 12
const SKELETON_COLOR = "color-mix(in oklch, var(--muted), var(--foreground) 6%)"
const SKELETON_BAR_RATIOS = [0.75, 0.5, 0.65, 0.85] as const
const EMPTY_MIN_BODY = 96
const MIN_SKELETON_ROWS = 8

function renderCell<TRow>(
  spec: CellSpec<TRow>,
  mode: CellMode,
  row: TRow | null,
  group: DataGridGroupItem<TRow> | null,
  index: number,
  grid: DataGridApi<TRow>,
  settings: RowSettings,
  slots?: DataGridSlots<TRow>
) {
  const { column } = spec
  const labelContext = {
    column,
    isLabelColumn: column.id === settings.labelColumnId,
    grid,
    labels: settings.labels,
    slots,
    indent: settings.groupIndent,
  }
  let content: ReactNode
  if (mode === "skeleton") {
    content = slots?.skeletonCell ? (
      slots.skeletonCell({ column, rowIndex: index })
    ) : (
      <Skeleton className={`h-4 ${column.align === "center" ? "mx-auto w-4" : BAR_WIDTHS[(index + spec.position) % 4]} ${column.align === "right" ? "ml-auto" : ""}`} />
    )
  } else if (mode === "group" && group) {
    content = renderGroupCellContent(group, labelContext)
  } else if (mode === "total") {
    content = renderTotalCellContent(grid.totals, labelContext)
  } else if (row !== null) {
    content = renderCellContent({
      row,
      column,
      index,
      grid,
      labels: settings.labels,
      slots,
      hidden: settings.hideGroupedCells && settings.groupBy.includes(column.id),
    })
  }
  const editProps = mode === "row" && row !== null ? getCellEditProps(grid, row, column, index) : undefined
  // Most cells are plain text: one element instead of two keeps the DOM (and
  // the cost of every row that scrolls in) down
  if (typeof content === "string" && mode !== "group" && mode !== "skeleton" && !spec.edge)
    return (
      <div
        key={column.id}
        role="gridcell"
        aria-colindex={spec.position}
        data-column-id={mode === "row" || mode === "total" ? column.id : undefined}
        className={`${spec.textClassName} ${EDITABLE_CELL_CLASS}${mode === "row" && settings.cellClickable ? " cursor-pointer" : ""}`}
        style={spec.textStyle}
        title={content}
        {...editProps}
      >
        {content}
      </div>
    )
  return (
    <div
      key={column.id}
      role="gridcell"
      aria-colindex={spec.position}
      data-column-id={mode === "row" || mode === "total" ? column.id : undefined}
      className={`${spec.className} ${EDITABLE_CELL_CLASS}${mode === "row" && settings.cellClickable ? " cursor-pointer" : ""}`}
      style={spec.style}
      title={typeof content === "string" ? content : undefined}
      {...editProps}
    >
      <div className={spec.contentClassName}>{content}</div>
    </div>
  )
}

interface VirtualRowProps<TRow> {
  mode: CellMode
  row: TRow | null
  group: DataGridGroupItem<TRow> | null
  index: number
  rowHeight: number
  totalWidth: number
  leftSpecs: readonly CellSpec<TRow>[]
  midSpecs: readonly CellSpec<TRow>[]
  rightSpecs: readonly CellSpec<TRow>[]
  leftSpacer: number
  rightSpacer: number
  selected: boolean
  selectionEnabled: boolean
  className: string
  /** Inline style of the row element (`styles.row`), under the sizes */
  rowStyle?: CSSProperties
  settings: RowSettings
  /**
   * The grid API. Deliberately left out of the memo comparison (it is a new
   * object every render): `versions` lists what a cell can depend on, and a
   * row that does re-render always gets the current one.
   */
  grid: DataGridApi<TRow>
  /** Identities that change when anything a cell could depend on changes */
  versions: readonly unknown[]
  slots?: DataGridSlots<TRow>
}

const sameList = (a: readonly unknown[], b: readonly unknown[]) => a.length === b.length && a.every((value, i) => value === b[i])

/**
 * Rows that were already on screen must not re-render when the window shifts
 * by a block, only the newly entering ones: that is what keeps big scrolls
 * cheap.
 */
function sameRow<TRow>(prev: VirtualRowProps<TRow>, next: VirtualRowProps<TRow>) {
  return (
    prev.mode === next.mode &&
    prev.row === next.row &&
    prev.group === next.group &&
    prev.index === next.index &&
    prev.rowHeight === next.rowHeight &&
    prev.totalWidth === next.totalWidth &&
    prev.leftSpacer === next.leftSpacer &&
    prev.rightSpacer === next.rightSpacer &&
    prev.selected === next.selected &&
    prev.selectionEnabled === next.selectionEnabled &&
    prev.className === next.className &&
    prev.rowStyle === next.rowStyle &&
    prev.settings === next.settings &&
    prev.slots === next.slots &&
    sameList(prev.versions, next.versions) &&
    sameList(prev.leftSpecs, next.leftSpecs) &&
    sameList(prev.midSpecs, next.midSpecs) &&
    sameList(prev.rightSpecs, next.rightSpecs)
  )
}

const VirtualRow = memo(function VirtualRow<TRow>({
  mode,
  row,
  group,
  index,
  rowHeight,
  totalWidth,
  leftSpecs,
  midSpecs,
  rightSpecs,
  leftSpacer,
  rightSpacer,
  selected,
  selectionEnabled,
  className,
  rowStyle,
  settings,
  grid,
  slots,
}: VirtualRowProps<TRow>) {
  const cell = (spec: CellSpec<TRow>) => renderCell(spec, mode, row, group, index, grid, settings, slots)
  const cells = (
    <>
      {leftSpecs.map(cell)}
      <div aria-hidden style={{ width: leftSpacer, flex: "none" }} />
      {midSpecs.map(cell)}
      <div aria-hidden style={{ width: rightSpacer, flex: "none" }} />
      {/* Soaks up spare width so right-pinned cells stay at the right edge */}
      <div aria-hidden className="flex-1" />
      {rightSpecs.map(cell)}
    </>
  )
  const style = { ...rowStyle, height: rowHeight, width: totalWidth, minWidth: "100%" }

  if (mode === "group" && group) {
    const toggle = () => grid.toggleGroup(group.key)
    return (
      <div
        role="row"
        aria-rowindex={index + settings.firstRowIndex}
        aria-expanded={group.expanded}
        data-slot="data-grid-group-row"
        className={className}
        style={style}
        onClick={toggle}
      >
        {slots?.groupRow ? slots.groupRow({ group, cells, toggle }) : cells}
      </div>
    )
  }
  return (
    <div
      role="row"
      aria-rowindex={index + settings.firstRowIndex}
      data-row-index={mode === "row" ? index : undefined}
      aria-selected={selectionEnabled && row !== null ? selected : undefined}
      data-state={selected ? "selected" : undefined}
      className={className}
      style={style}
    >
      {mode === "row" && row !== null && slots?.row ? slots.row({ row, index, selected, cells }) : cells}
    </div>
  )
}, sameRow) as <TRow>(props: VirtualRowProps<TRow>) => ReactNode

/**
 * The virtualized grid. A spacer gives the native scrollbar its full extent,
 * the header (column groups included) is sticky, and the rows of the current
 * window sit at their real position inside the spacer, so the browser scrolls
 * them without any script running per frame. Only the rows/columns in
 * `window` exist in the DOM.
 */
export function DataGridVirtualBody<TRow>({
  grid,
  display,
  leftColumns,
  midColumns,
  rightColumns,
  columnOffsets,
  totalWidth,
  sizing,
  stickyOffsets,
  stickyDivider,
  window,
  metrics,
  bodyRef,
  placeholderRef,
  rowHeight,
  headerHeight,
  headerGroupDepth,
  headerGroupHeight,
  renderHeaderCell,
  labels,
  labelColumnId,
  groupIndent,
  hideGroupedCells,
  showFooterRow,
  selectionEnabled,
  skeleton,
  rowClassName,
  getRowKey,
  emptyContent,
  columnCount,
  placeholder,
  slots,
}: DataGridVirtualBodyProps<TRow>) {
  const { classNames, styles, bordered, rowClickable, cellClickable } = useDataGridParts()
  const visibleMid = midColumns.slice(window.columns.start, window.columns.end)
  const leftSpacer = columnOffsets[window.columns.start] ?? 0
  const rightSpacer = (columnOffsets[midColumns.length] ?? 0) - (columnOffsets[window.columns.end] ?? 0)
  const rowWidth: CSSProperties = { width: totalWidth, minWidth: "100%" }
  const headerRowsHeight = headerGroupDepth * headerGroupHeight + headerHeight
  const footerHeight = showFooterRow ? rowHeight : 0
  const leftWidth = leftColumns.reduce((sum, column) => sum + sizing.getWidth(column), 0)

  const positions = new Map<string, number>()
  ;[...leftColumns, ...midColumns, ...rightColumns].forEach((column, index) => positions.set(column.id, index + 1))

  // Per-column cell settings. Specs are cached per column object so rows get
  // identical references while nothing about the column changed (memoized rows)
  const cellStyleKey = styles.cell ? JSON.stringify(styles.cell) : ""
  const toSpec =
    (kind: "row" | "group") =>
    (column: DataGridColumnDef<TRow>): CellSpec<TRow> => {
      const offset = stickyOffsets[column.id]
      const width = sizing.getWidth(column)
      const position = positions.get(column.id) ?? 0
      const key = `${position}|${width}|${rowHeight}|${classNames.cell ?? ""}|${cellStyleKey}|${bordered}|${offset ? `${offset.side}${offset.offset}${offset.edge}` : ""}|${stickyDivider}`
      const cache = SPEC_CACHE[kind] as WeakMap<DataGridColumnDef<TRow>, { key: string; spec: CellSpec<TRow> }>
      const hit = cache.get(column)
      if (hit && hit.key === key) return hit.spec
      const sticky = getStickyCell({
        offset,
        header: false,
        stickyHeader: true,
        divider: stickyDivider,
        group: kind === "group",
      })
      const spec: CellSpec<TRow> = {
        column,
        position,
        className:
          // isolate: a z-index used inside a cell must never paint over a pinned cell
          // (the pinned edge cell shows a shadow outside itself: no clipping)
          cn(`isolate flex items-center px-2${sticky.edge ? "" : " overflow-hidden"}`, bordered && "border-r", sticky.className, classNames.cell),
        style: { ...styles.cell, width, flex: "none", ...sticky.style },
        contentClassName: `min-w-0 flex-1 truncate ${ALIGN_CLASS[column.align ?? "left"].text}`,
        edge: sticky.edge,
        textClassName: cn("isolate block truncate px-2", ALIGN_CLASS[column.align ?? "left"].text, bordered && "border-r", sticky.className, classNames.cell),
        // The row's bottom border takes 1px of the height
        textStyle: {
          width,
          flex: "none",
          ...styles.cell,
          lineHeight: `${rowHeight - 1}px`,
          ...sticky.style,
        },
      }
      cache.set(column, { key, spec })
      return spec
    }
  const rowSpecs = {
    left: leftColumns.map(toSpec("row")),
    mid: visibleMid.map(toSpec("row")),
    right: rightColumns.map(toSpec("row")),
  }
  const groupSpecs = {
    left: leftColumns.map(toSpec("group")),
    mid: visibleMid.map(toSpec("group")),
    right: rightColumns.map(toSpec("group")),
  }

  const versions = [grid.state, grid.columnState, grid.selection.selectedRowIds, grid.visibleColumns, grid.totals, grid.groupBy, grid.editing.cell, grid.editing.pending]
  const settings = useMemo<RowSettings>(
    () => ({
      labels,
      labelColumnId,
      groupIndent,
      hideGroupedCells,
      groupBy: grid.groupBy,
      cellClickable,
      // Column-group rows + the column header row
      firstRowIndex: headerGroupDepth + 2,
    }),
    [labels, labelColumnId, groupIndent, hideGroupedCells, grid.groupBy, cellClickable, headerGroupDepth]
  )

  const renderedRows: ReactNode[] = []
  const common = {
    rowHeight,
    totalWidth,
    leftSpacer,
    rightSpacer,
    selectionEnabled,
    settings,
    grid,
    versions,
    slots,
  }
  // At least a screenful (and never fewer than a few rows): with no rows yet the
  // grid has no height of its own to measure a screen from
  const skeletonCount = Math.max(MIN_SKELETON_ROWS, Math.ceil(metrics.bodyViewport / rowHeight))
  if (skeleton) {
    const count = skeletonCount
    for (let index = 0; index < count; index++) {
      renderedRows.push(
        <VirtualRow
          key={index}
          mode="skeleton"
          row={null}
          group={null}
          index={index}
          leftSpecs={rowSpecs.left}
          midSpecs={rowSpecs.mid}
          rightSpecs={rowSpecs.right}
          selected={false}
          className="flex border-b bg-background"
          {...common}
          selectionEnabled={false}
        />
      )
    }
  } else {
    for (let index = window.rows.start; index < window.rows.end; index++) {
      const item = display.item(index)
      if (item === undefined) continue
      if (item.kind === "group") {
        renderedRows.push(
          <VirtualRow
            key={item.key}
            mode="group"
            row={null}
            group={item}
            index={index}
            leftSpecs={groupSpecs.left}
            midSpecs={groupSpecs.mid}
            rightSpecs={groupSpecs.right}
            selected={false}
            className={cn(GROUP_ROW_CLASS, classNames.groupRow)}
            rowStyle={styles.groupRow}
            {...common}
            selectionEnabled={false}
          />
        )
        continue
      }
      const { row } = item
      const extraClass = rowClassName?.(row, index)
      renderedRows.push(
        <VirtualRow
          key={getRowKey ? getRowKey(row, index) : index}
          mode="row"
          row={row}
          group={null}
          index={index}
          leftSpecs={rowSpecs.left}
          midSpecs={rowSpecs.mid}
          rightSpecs={rowSpecs.right}
          selected={selectionEnabled && grid.selection.isSelected(row)}
          className={cn(ROW_CLASS, rowClickable && "cursor-pointer", extraClass, classNames.row)}
          rowStyle={styles.row}
          {...common}
        />
      )
    }
  }

  // ---- column-group rows (header levels above the column headers)
  const regions: Record<HeaderRegion, readonly DataGridColumnDef<TRow>[]> = {
    left: leftColumns,
    mid: midColumns,
    right: rightColumns,
  }
  const renderGroupRow = (level: number) => {
    const cells = getGroupCells(regions, level)
    const cellFor = (cell: HeaderGroupCell<TRow>, width: number) => {
      const sticky = getStickyCell({
        offset: getGroupCellOffset(cell, stickyOffsets),
        header: true,
        stickyHeader: true,
      })
      return (
        <div
          key={`${cell.region}-${cell.start}`}
          role="columnheader"
          aria-colspan={cell.columns.length}
          // clip (not hidden) keeps the sticky label below working
          className={cn("isolate flex items-center overflow-clip border-l font-medium whitespace-nowrap", sticky.className)}
          style={{ ...styles.headerGroup, width, flex: "none", ...sticky.style }}
        >
          {/* User classes on the inner box, over the cell's opaque background */}
          <div className={cn("flex h-full w-full items-center px-2", classNames.headerGroup)}>
            {/* The label sticks to the left edge so wide groups stay readable */}
            <div className="sticky truncate" style={{ left: cell.region === "mid" ? leftWidth : 0 }}>
              {renderGroupLabel(cell, slots)}
            </div>
          </div>
        </div>
      )
    }
    const widthOf = (columns: readonly DataGridColumnDef<TRow>[]) => columns.reduce((sum, column) => sum + sizing.getWidth(column), 0)
    const left = cells.filter((cell) => cell.region === "left")
    const right = cells.filter((cell) => cell.region === "right")
    // Scrolling groups keep their full width; render the ones touching the window
    const mid = cells.filter((cell) => cell.region === "mid" && cell.end > window.columns.start && cell.start < window.columns.end)
    const midLeft = mid.length ? (columnOffsets[mid[0].start] ?? 0) : 0
    const midRight = mid.length ? (columnOffsets[midColumns.length] ?? 0) - (columnOffsets[mid[mid.length - 1].end] ?? 0) : 0
    return (
      <div key={level} role="row" aria-rowindex={level + 1} className="flex" style={{ height: headerGroupHeight, ...rowWidth }}>
        {left.map((cell) => cellFor(cell, widthOf(cell.columns)))}
        <div aria-hidden className={HEADER_GAP} style={{ width: midLeft, flex: "none" }} />
        {mid.map((cell) => cellFor(cell, widthOf(cell.columns)))}
        <div aria-hidden className={HEADER_GAP} style={{ width: midRight, flex: "none" }} />
        <div aria-hidden className={`flex-1 ${HEADER_GAP}`} />
        {right.map((cell) => cellFor(cell, widthOf(cell.columns)))}
      </div>
    )
  }

  // ---- total row, pinned to the bottom of the viewport
  // The row itself sticks to the bottom; its cells only need the usual
  // left / right pinning, which the row-cell specs already carry
  const footerCell = (spec: CellSpec<TRow>) => renderCell(spec, "total", null, null, 0, grid, settings, slots)
  const footerCells = (
    <>
      {rowSpecs.left.map(footerCell)}
      <div aria-hidden style={{ width: leftSpacer, flex: "none" }} />
      {rowSpecs.mid.map(footerCell)}
      <div aria-hidden style={{ width: rightSpacer, flex: "none" }} />
      <div aria-hidden className="flex-1" />
      {rowSpecs.right.map(footerCell)}
    </>
  )

  /**
   * Row lines, plus (skeleton) one grey bar per rendered column: CSS
   * backgrounds, so no DOM and no React for the rows nobody can see yet.
   */
  const lineGradient = "linear-gradient(to bottom, transparent calc(100% - 1px), var(--border) calc(100% - 1px))"
  const linesStyle: CSSProperties = {
    backgroundImage: lineGradient,
    backgroundSize: `100% ${rowHeight}px`,
    backgroundPosition: `0 ${headerRowsHeight}px`,
    backgroundRepeat: "repeat-y",
  }
  /** One grey bar per rendered column, repeated down every row (CSS only). */
  const barsStyle = (): CSSProperties => {
    const top = (rowHeight - SKELETON_BAR_HEIGHT) / 2
    const bar = `linear-gradient(to bottom, transparent ${top}px, ${SKELETON_COLOR} ${top}px, ${SKELETON_COLOR} ${top + SKELETON_BAR_HEIGHT}px, transparent ${top + SKELETON_BAR_HEIGHT}px)`
    const bars = midColumns.slice(window.columns.start, window.columns.end).map((column, offset) => {
      const index = window.columns.start + offset
      const width = sizing.getWidth(column)
      return {
        x: leftWidth + (columnOffsets[index] ?? 0) + 8,
        width: Math.max(16, (width - 16) * SKELETON_BAR_RATIOS[index % 4]),
      }
    })
    return {
      backgroundImage: bars.map(() => bar).join(", "),
      backgroundSize: bars.map((item) => `${item.width}px ${rowHeight}px`).join(", "),
      backgroundPosition: bars.map((item) => `${item.x}px ${headerRowsHeight}px`).join(", "),
      backgroundRepeat: "repeat-y",
    }
  }

  const empty = !skeleton && display.count === 0
  // Skeleton rows need room even when there are (almost) no real rows yet
  const skeletonHeight = headerRowsHeight + footerHeight + skeletonCount * rowHeight
  const spacerHeight = empty ? headerRowsHeight + EMPTY_MIN_BODY + footerHeight : skeleton ? Math.max(metrics.scrollSize, skeletonHeight) : metrics.scrollSize
  return (
    <div
      data-slot="data-grid-virtual-spacer"
      role="grid"
      aria-rowcount={display.count + 1 + headerGroupDepth}
      aria-colcount={columnCount}
      // text-sm: the regular table sets it on <table>, keep the same type size
      className={cn("relative text-sm", classNames.table)}
      // The height is what gives the native scrollbar its extent
      style={{
        ...styles.table,
        height: spacerHeight,
        ...rowWidth,
        // Row lines drawn by CSS (nearly free): during a fling that outruns the
        // rendered rows the area still looks like a grid, not a white flash
        ...(placeholder !== "none" && !empty ? linesStyle : undefined),
      }}
    >
      <div className={cn("sticky top-0 z-30", classNames.header)} style={{ ...styles.header, ...rowWidth }}>
        {Array.from({ length: headerGroupDepth }, (_, level) => renderGroupRow(level))}
        <div role="row" aria-rowindex={headerGroupDepth + 1} className={cn("flex", classNames.headerRow)} style={{ ...styles.headerRow, height: headerHeight, ...rowWidth }}>
          {leftColumns.map(renderHeaderCell)}
          <div aria-hidden className={HEADER_GAP} style={{ width: leftSpacer, flex: "none" }} />
          {visibleMid.map(renderHeaderCell)}
          <div aria-hidden className={HEADER_GAP} style={{ width: rightSpacer, flex: "none" }} />
          <div aria-hidden className={`flex-1 ${HEADER_GAP}`} />
          {rightColumns.map(renderHeaderCell)}
        </div>
      </div>
      {placeholder === "skeleton" && !empty && !skeleton && (
        // Under the (opaque) rows. Hidden while flinging: skeleton bars that
        // appear for a frame and vanish again just look like flicker.
        <div
          ref={placeholderRef}
          aria-hidden
          data-slot="data-grid-placeholder"
          className="pointer-events-none absolute inset-0 opacity-100 transition-opacity duration-200 data-fast:opacity-0 data-fast:transition-none"
          style={barsStyle()}
        />
      )}
      <div ref={bodyRef} className="absolute left-0" style={{ top: headerRowsHeight, ...rowWidth }}>
        {renderedRows}
      </div>
      {empty && (
        // sticky + 100cqw (the scroll area's visible width): centred in the
        // viewport however far the grid is scrolled sideways
        <div
          className={cn("sticky left-0 flex items-center justify-center text-sm text-muted-foreground", classNames.empty)}
          style={{ ...styles.empty, width: "100cqw", height: EMPTY_MIN_BODY }}
        >
          {emptyContent}
        </div>
      )}
      {showFooterRow && (
        <>
          {/* Takes the space between header and footer so the footer's natural
              position is the end of the spacer; sticky then pins it to the
              bottom of the viewport */}
          <div aria-hidden style={{ height: spacerHeight - headerRowsHeight - footerHeight }} />
          <div
            role="row"
            data-slot="data-grid-total-row"
            // The top line is drawn just above the row, over the last body row's
            // own bottom border: one line at the end, still a divider mid-scroll
            className={cn("sticky bottom-0 z-30 flex bg-background font-medium shadow-[0_-1px_0_var(--border)]", classNames.footerRow)}
            style={{ ...styles.footerRow, height: footerHeight, ...rowWidth }}
          >
            {slots?.footerRow ? slots.footerRow({ totals: grid.totals, cells: footerCells }) : footerCells}
          </div>
        </>
      )}
    </div>
  )
}
