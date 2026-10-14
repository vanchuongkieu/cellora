import { useMemo, useRef, type CSSProperties, type MouseEvent, type ReactNode, type RefObject } from "react"
import { LoaderCircleIcon } from "lucide-react"
import { cn } from "cn"
import { createOffsets, getHeaderGroupDepth, getStickyOffsets, type SearchOptions } from "@cellora/core"

import { DataGridColumnMenu, getColumnMenuItems, type DataGridColumnMenuItems } from "./data-grid-column-menu"
import { DataGridFooter } from "./data-grid-footer"
import { DataGridGroupPanel } from "./data-grid-group-panel"
import { DataGridHeaderCell, type DataGridAutoFit, type DataGridResizeHandle } from "./data-grid-header-cell"
import { DataGridStyleProvider } from "./styling"
import { DataGridTable } from "./data-grid-table"
import { DataGridColumn, SLOT_PARTS, useResolvedColumns, useResolvedSlots, type DataGridSlotComponents, type DataGridSlotParts } from "./declarative"
import { DataGridVirtualBody, type DataGridVirtualPlaceholder } from "./data-grid-virtual-body"
import { DataGridToolbar } from "./data-grid-toolbar"
import { DEFAULT_LABELS } from "./labels"
import { createSelectionColumn, SELECTION_COLUMN_ID, type DataGridSelectAllScope } from "./selection-column"
import type { DataGridEditingCell } from "./use-cell-editing"
import type {
  DataGridCellClick,
  DataGridCellEdit,
  DataGridClassNames,
  DataGridColumnInput,
  DataGridRowClick,
  DataGridStyles,
  DataGridColumnDef,
  DataGridColumnMenuContext,
  DataGridLabels,
  DataGridSelectionChange,
  DataGridSlots,
} from "./types"
import { useColumnSizing } from "./use-column-sizing"
import { useDataGrid, type DataGridServerOptions, type DataGridStateOptions } from "./use-data-grid"
import { useMaxElementHeight } from "./max-element-height"
import { usePinnedShadow } from "./use-pinned-shadow"
import { useFillHeight } from "./use-fill-height"
import { useStablePageHeight } from "./use-stable-page-height"
import { useVirtualGrid } from "./use-virtual-grid"

/** Clicks on these keep their own meaning and never count as a row / cell click. */
const INTERACTIVE_ELEMENTS = 'button, a[href], input, select, textarea, label, [role="checkbox"], [role="switch"], [role="menuitem"], [role="combobox"], [data-no-row-click]'

/** Height of a regular table row: p-2 padding + 20px text line + 1px border. */
const TABLE_ROW_HEIGHT = 37

export type DataGridLoadingVariant = "auto" | "skeleton" | "overlay"

/**
 * Props of the grid. Sorting, search, filters and paging can be the grid's
 * own (default) or an API's: see `DataGridServerOptions` (`manualSorting`,
 * `manualFiltering`, `manualPagination`, `rowCount`) and
 * `DataGridStateOptions` (`sort`, `filter`, `columnFilters`, `pageIndex`,
 * their `default*` twins and `onStateChange`).
 */
export interface DataGridProps<TRow> extends DataGridServerOptions, DataGridStateOptions, SearchOptions<TRow> {
  rows: readonly TRow[]
  /**
   * The columns. Optional: columns can also be written as `<DataGrid.Column>`
   * children; both are used when both are given (this array first).
   */
  columns?: readonly DataGridColumnInput<TRow>[]
  /**
   * Declarative parts, read by the grid and not rendered in place:
   * `<DataGrid.Column>` for columns and `<DataGrid.Toolbar>`, `<DataGrid.Empty>`, …
   * (or `<DataGridSlot name="…">`) for slots. Take a function (called with the
   * slot's context) or plain content. They win over `components` and `slots`.
   */
  children?: ReactNode
  /**
   * Stable key per row. Row selection is stored by this id, so give rows a
   * real id if rows can be reordered or reloaded. Defaults to the row index.
   * Selection reads it once per `rows` array (an inline function is fine).
   */
  getRowId?: (row: TRow, index: number) => string
  /**
   * Called when a body row is clicked (not for a button, link, checkbox or
   * field inside it, which keep their own clicks). Rows get the pointer cursor.
   */
  onRowClick?: (click: DataGridRowClick<TRow>) => void
  /**
   * Called when a body cell is clicked (same rules as `onRowClick`; the row
   * click follows). Cells get the pointer cursor.
   */
  onCellClick?: (click: DataGridCellClick<TRow>) => void
  /** Lines between the columns as well as between rows. Defaults to false. */
  bordered?: boolean
  /** Extra classes for a body row. */
  rowClassName?: (row: TRow, index: number) => string | undefined
  pageSize?: number
  pageSizeOptions?: readonly number[]
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
  /**
   * Extra classes per part of the grid (`root`, `toolbar`, `scroll`, `header`,
   * `headerCell`, `row`, `cell`, `footer`, ...). They are merged after the
   * defaults and win over them, so they restyle the grid without a rewrite.
   * The defaults themselves follow the host's shadcn theme (its CSS variables).
   */
  classNames?: DataGridClassNames
  /** Inline styles per part, for what a class cannot say. */
  styles?: DataGridStyles
  /** Replace any part of the chrome: toolbar, rows, footer pieces, icons. */
  slots?: DataGridSlots<TRow>
  /**
   * The same slots as components: `components={{ toolbar: MyToolbar }}`. The
   * component receives the slot's context as props (`{ grid }` for the
   * toolbar, search, empty, footer, group panel and loading overlay; `{ direction }`
   * for `sortIcon`). Hooks work inside. They win over `slots`.
   */
  components?: DataGridSlotComponents<TRow>
  /** Override any user-facing string (i18n). */
  labels?: Partial<DataGridLabels>
  /**
   * Height cap (px or CSS length) of the scroll area; rows scroll inside it.
   * Pass null for no cap. Defaults to 400.
   */
  maxHeight?: number | string | null
  /**
   * Fill the screen: the scroll area takes the height that is left under
   * everything else on the page, so the page itself does not scroll. Measured
   * from the real layout (header, toolbar, margins, paddings, borders, footer all
   * count) and kept up to date on resize. Replaces `maxHeight`. Defaults to false.
   */
  fillHeight?: boolean
  /** With `fillHeight`: pixels to leave free below the grid. Defaults to 0. */
  fillHeightOffset?: number
  /** With `fillHeight`: the area is never shorter than this. Defaults to 200. */
  fillHeightMin?: number
  /**
   * With `fillHeight`: fill this scrolling element instead of the window (for
   * grids inside a panel that scrolls on its own). Pass an element or a ref.
   */
  fillHeightContainer?: RefObject<HTMLElement | null> | HTMLElement | null
  /** Keep the header visible while rows scroll. Defaults to true. */
  stickyHeader?: boolean
  /** Show the search box. Defaults to false. */
  enableSearch?: boolean
  /** Master switch for header sorting; columns still opt in via `sortable`. Defaults to false. */
  enableSorting?: boolean
  /** Master switch for drag/keyboard column resizing; columns can opt out via `resizable: false`. Defaults to true. */
  enableColumnResizing?: boolean
  /**
   * When the resize handle in each header is visible: always (faint divider,
   * highlighted on hover) or only on hover. Defaults to "always".
   */
  resizeHandle?: DataGridResizeHandle
  /**
   * Extra classes for the handle bar; they override the defaults, e.g.
   * "h-8 w-1 bg-primary" for a taller, thicker, always-coloured bar.
   */
  resizeHandleClassName?: string
  /** Inline style for the handle bar. */
  resizeHandleStyle?: CSSProperties
  /**
   * Double-click a resize handle to fit the column to its content: the widest
   * cell currently rendered (true or "cells"), "header", or "both". false
   * turns it off. Defaults to true.
   */
  autoFitOnDoubleClick?: boolean | DataGridAutoFit
  /**
   * Fixed column widths: content never changes a column's width and long text
   * is truncated. Required for resizing and pinned (`sticky`) columns.
   * Set false for browser auto layout. Defaults to true.
   */
  fixedColumnWidths?: boolean
  /** Paginate rows and show the footer. Defaults to true. */
  enablePagination?: boolean
  /** The ⋮ menu in each header (sort, pin, filter, hide, manage). Defaults to true. */
  enableColumnMenu?: boolean
  /** Turn individual menu groups off, e.g. `{ filter: false }`. All on by default. */
  columnMenuItems?: DataGridColumnMenuItems
  /** Width of the column menu (px or CSS length). Defaults to 220. */
  columnMenuWidth?: number | string
  /** Extra classes for the menu panel; they override the defaults. */
  columnMenuClassName?: string
  /** Extra classes for the ⋮ button. */
  columnMenuTriggerClassName?: string
  /** Which edge of the ⋮ button the menu lines up with. Defaults to "end". */
  columnMenuAlign?: "start" | "center" | "end"
  /** Vertical divider on the innermost pinned column on each side. Defaults to false. */
  stickyDivider?: boolean
  /**
   * Shadow on the innermost pinned column of each side, shown only while
   * content is scrolled sideways underneath it. Defaults to true.
   */
  stickyShadow?: boolean
  /**
   * Virtual scrolling: only the rows and columns in view are rendered, so
   * hundreds of columns and millions of rows stay smooth. Rows scroll instead
   * of paginating and have a fixed height. Needs a height cap (`maxHeight`
   * falls back to 400 if null). Defaults to false.
   */
  virtualized?: boolean
  /**
   * Row height in px when virtualized. Defaults to 37, the regular table's
   * rows, whatever the row count. Rows that fit in the browser's maximum
   * element height (about 890k rows at 37px in Chrome) scroll 100% natively;
   * beyond that the scroll positions are scaled.
   */
  rowHeight?: number
  /** Header height in px when virtualized. Defaults to 40. */
  headerHeight?: number
  /**
   * How far ahead to render, in viewport sizes on each side, so fast scrolling
   * never shows blank rows. A number applies to rows and columns; or set them
   * separately. Defaults to 2 for rows and 0.5 for columns.
   */
  overscanScreens?: number | { rows?: number; columns?: number }
  /** Minimum extra rows rendered above and below the viewport. Defaults to 10. */
  overscanRows?: number
  /** Minimum extra columns rendered left and right of the viewport. Defaults to 3. */
  overscanColumns?: number
  /**
   * What fills the space not rendered yet when a fast scroll outruns the rows:
   * "skeleton" (grey bars per column), "lines" or "none". Defaults to "skeleton".
   */
  virtualPlaceholder?: DataGridVirtualPlaceholder
  /** Show column-group rows above the headers (from `column.headerGroup`). Defaults to true. */
  enableHeaderGroups?: boolean
  /** Height of each column-group row in px. Defaults to `headerHeight`. */
  headerGroupHeight?: number
  /** Column ids to group rows by, outermost first (controlled). */
  groupBy?: readonly string[]
  defaultGroupBy?: readonly string[]
  onGroupByChange?: (groupBy: readonly string[]) => void
  /** Whether row groups start expanded. Defaults to false. */
  groupDefaultExpanded?: boolean
  /** px of indent per group nesting level. Defaults to 16. */
  groupIndent?: number
  /** Leave the grouped column's cells empty on data rows (the group row shows it). Defaults to true. */
  hideGroupedCells?: boolean
  /** Pin a total row (the columns' `aggregate`) to the bottom. Defaults to false. */
  enableFooterRow?: boolean
  /** Inline cell editing; columns opt in with `editable`. Defaults to false. */
  enableEditing?: boolean
  /** What starts editing (Enter / F2 always work). Defaults to "doubleClick". */
  editTrigger?: "doubleClick" | "click" | "none"
  /**
   * Called with every accepted change. The grid does not own your data: apply
   * the change to `rows`. Return false or throw to reject it.
   */
  onCellEdit?: (edit: DataGridCellEdit<TRow>) => unknown
  /** Extra per-cell gate on top of `column.editable`. */
  isCellEditable?: (ctx: { row: TRow; column: DataGridColumnDef<TRow> }) => boolean
  /** The cell being edited changed (null when the editor closed). */
  onEditingChange?: (cell: DataGridEditingCell<TRow> | null) => void
  /**
   * A "group by" bar above the grid: drag a column header onto it to group
   * rows by that column. Defaults to false.
   */
  enableGroupPanel?: boolean
  /** Show the loading state. Defaults to false. */
  loading?: boolean
  /**
   * How loading looks: "skeleton" placeholder rows, "overlay" spinner over the
   * current rows, or "auto" (skeleton when there are no rows yet, overlay
   * otherwise). Defaults to "auto".
   */
  loadingVariant?: DataGridLoadingVariant
  /** Number of skeleton rows. Defaults to the page size, at most 10. */
  loadingRows?: number
  /** Add a checkbox column with a select-all header. Defaults to false. */
  enableRowSelection?: boolean
  /**
   * What the header checkbox covers: the rows on this "page" or every row
   * matching the current filters ("all"). Defaults to "page".
   */
  selectAllScope?: DataGridSelectAllScope
  /** Return false to make a row's checkbox disabled. */
  isRowSelectable?: (row: TRow) => boolean
  /** Keep the checkbox column pinned to the left. Defaults to true. */
  pinSelectionColumn?: boolean
  /** Controlled selection (row ids). Omit to let the grid manage it. */
  selectedRowIds?: readonly string[]
  defaultSelectedRowIds?: readonly string[]
  /** Called with the checked ids, rows and count on every change. */
  onSelectionChange?: (change: DataGridSelectionChange<TRow>) => void
}

function DataGridRoot<TRow>({
  rows,
  columns: columnsProp,
  children,
  components,
  getRowId,
  rowClassName,
  onRowClick,
  onCellClick,
  bordered = false,
  pageSize = 10,
  pageSizeOptions = [10, 20, 50],
  searchPlaceholder = "Search...",
  emptyMessage = "No results.",
  className,
  classNames,
  styles,
  slots: slotsProp,
  labels,
  maxHeight = 400,
  fillHeight = false,
  fillHeightOffset = 0,
  fillHeightMin = 200,
  fillHeightContainer,
  stickyHeader = true,
  enableSearch = false,
  enableSorting = false,
  enableColumnResizing = true,
  resizeHandle = "always",
  resizeHandleClassName,
  resizeHandleStyle,
  autoFitOnDoubleClick = true,
  fixedColumnWidths: fixedColumnWidthsProp = true,
  enablePagination = true,
  enableColumnMenu = true,
  columnMenuItems,
  columnMenuWidth,
  columnMenuClassName,
  columnMenuTriggerClassName,
  columnMenuAlign,
  stickyDivider = false,
  stickyShadow = true,
  virtualized = false,
  rowHeight: rowHeightProp,
  headerHeight = 40,
  virtualPlaceholder = "skeleton",
  overscanScreens,
  overscanRows = 10,
  overscanColumns = 3,
  enableHeaderGroups = true,
  headerGroupHeight: headerGroupHeightProp,
  groupBy,
  defaultGroupBy,
  onGroupByChange,
  groupDefaultExpanded = false,
  groupIndent = 16,
  hideGroupedCells = true,
  enableFooterRow = false,
  enableGroupPanel = false,
  enableEditing = false,
  editTrigger,
  onCellEdit,
  isCellEditable,
  onEditingChange,
  loading = false,
  loadingVariant = "auto",
  loadingRows,
  enableRowSelection = false,
  selectAllScope = "page",
  isRowSelectable,
  pinSelectionColumn = true,
  selectedRowIds,
  defaultSelectedRowIds,
  onSelectionChange,
  sort,
  defaultSort,
  filter,
  defaultFilter,
  columnFilters,
  defaultColumnFilters,
  pageIndex,
  defaultPageIndex,
  onStateChange,
  manualSorting,
  manualFiltering,
  manualPagination,
  rowCount,
  ignoreAccents,
  searchFilter,
}: DataGridProps<TRow>) {
  const columns = useResolvedColumns(columnsProp, children)
  const slots = useResolvedSlots(slotsProp, components, children)
  // Windowing positions everything from column widths, so virtual mode is
  // always fixed-width
  const fixedColumnWidths = fixedColumnWidthsProp || virtualized
  const maxElementHeight = useMaxElementHeight(virtualized)
  // Same height for every row count, so switching datasets never changes the
  // look. Every row position is a multiple of it: never 0 or negative.
  const rowHeight = Math.max(1, rowHeightProp ?? TABLE_ROW_HEIGHT)
  const mergedLabels = useMemo(() => ({ ...DEFAULT_LABELS, ...labels }), [labels])
  const grid = useDataGrid({
    rows,
    columns,
    pageSize,
    // Virtualized rows scroll instead of paging
    paginate: enablePagination && !virtualized,
    selectionEnabled: enableRowSelection,
    isRowSelectable,
    groupBy,
    defaultGroupBy,
    onGroupByChange,
    groupDefaultExpanded,
    computeTotals: enableFooterRow,
    enableEditing,
    editTrigger,
    onCellEdit,
    isCellEditable,
    onEditingChange,
    getRowId,
    selectedRowIds,
    defaultSelectedRowIds,
    onSelectionChange,
    sort,
    defaultSort,
    filter,
    defaultFilter,
    columnFilters,
    defaultColumnFilters,
    pageIndex,
    defaultPageIndex,
    onStateChange,
    manualSorting,
    manualFiltering,
    manualPagination,
    rowCount,
    ignoreAccents,
    searchFilter,
  })
  const sizing = useColumnSizing()

  // The checkbox column lives beside the user's columns, outside the column
  // state, so hiding / filtering / menus never touch it. Memoized: the cell
  // settings of virtual rows are cached per column object, so a new column on
  // every render would re-render every row on every render.
  const selectionColumn = useMemo(
    () => (enableRowSelection ? createSelectionColumn<TRow>({ pinned: pinSelectionColumn, scope: selectAllScope, isRowSelectable, labels: mergedLabels, slots }) : null),
    [enableRowSelection, pinSelectionColumn, selectAllScope, isRowSelectable, mergedLabels, slots]
  )
  const renderColumns = selectionColumn ? [selectionColumn, ...grid.visibleColumns] : grid.visibleColumns

  const totalWidth = renderColumns.reduce((sum, column) => sum + sizing.getWidth(column), 0)
  const stickyOffsets = fixedColumnWidths ? getStickyOffsets(renderColumns, sizing.sizes) : {}
  const scrollRef = useRef<HTMLDivElement | null>(null)
  // Pinned columns always render; only the scrolling middle is windowed
  const leftColumns = renderColumns.filter((column) => column.sticky === "left")
  const rightColumns = renderColumns.filter((column) => column.sticky === "right")
  const midColumns = renderColumns.filter((column) => !column.sticky)
  // Offsets depend on widths only, so key the memo on them: the array keeps its
  // identity while nothing resizes and the virtual window is not recomputed.
  const midWidthsKey = midColumns.map((column) => sizing.getWidth(column)).join(",")
  const columnOffsets = useMemo(() => createOffsets(midWidthsKey ? midWidthsKey.split(",").map(Number) : []), [midWidthsKey])
  // Column-group rows stack above the column headers
  const headerGroupHeight = headerGroupHeightProp ?? headerHeight
  const headerGroupDepth = enableHeaderGroups ? getHeaderGroupDepth(renderColumns) : 0
  const headerRowsHeight = headerGroupDepth * headerGroupHeight + headerHeight
  // Group labels and the "Total" text go in one column
  // (the grouped column when it is visible, otherwise the first real column)
  const groupedColumn = grid.groupBy.map((id) => renderColumns.find((column) => column.id === id)).find(Boolean)
  const labelColumnId = (groupedColumn ?? renderColumns.find((column) => column.id !== SELECTION_COLUMN_ID))?.id
  usePinnedShadow(scrollRef, stickyShadow, virtualized)
  const virtual = useVirtualGrid({
    enabled: virtualized,
    containerRef: scrollRef,
    rowCount: grid.display.count,
    rowHeight,
    maxScrollSize: maxElementHeight,
    // Everything that is not a scrolling row: header rows + the total row
    headerHeight: headerRowsHeight + (enableFooterRow ? rowHeight : 0),
    overscanRows,
    overscanColumns,
    overscanRowScreens: typeof overscanScreens === "number" ? overscanScreens : (overscanScreens?.rows ?? 2),
    overscanColumnScreens: typeof overscanScreens === "number" ? overscanScreens : (overscanScreens?.columns ?? 0.5),
    columnOffsets,
    // Before measuring (server render, first paint) assume the height cap
    initialViewportHeight: typeof maxHeight === "number" ? maxHeight : 400,
  })
  const canSort = (column: DataGridColumnDef<TRow>) => enableSorting && Boolean(column.sortable)
  const canResize = (column: DataGridColumnDef<TRow>) => fixedColumnWidths && enableColumnResizing && column.resizable !== false
  const showSkeleton = loading && (loadingVariant === "skeleton" || (loadingVariant === "auto" && rows.length === 0))
  const showOverlay = loading && !showSkeleton
  const fillPx = useFillHeight(scrollRef, { enabled: fillHeight, offset: fillHeightOffset, min: fillHeightMin, container: fillHeightContainer })
  // A short last page keeps the height of a full one (not while grouped: group
  // rows make "rows per page" meaningless for the height)
  const stableHeight = useStablePageHeight(scrollRef, {
    enabled: !fillHeight && enablePagination && !virtualized && !showSkeleton && grid.result.pageCount > 1 && grid.groupBy.length === 0,
    // The "rows per page" select changes it at runtime
    pageSize: grid.state.pageSize,
    rowCount: grid.result.rows.length,
    resetKey: `${columns.length}|${grid.visibleColumns.length}|${enableHeaderGroups}|${enableFooterRow}|${stickyHeader}`,
    maxHeight,
  })

  const renderMenu = (column: DataGridColumnDef<TRow>) => {
    if (!enableColumnMenu || column.menu === false) return null
    const ctx: DataGridColumnMenuContext<TRow> = {
      column,
      grid,
      columns,
      sorted: grid.state.sort?.columnId === column.id ? grid.state.sort.direction : null,
      pinned: column.sticky ?? false,
      filterValue: grid.state.columnFilters[column.id] ?? "",
      canSort: canSort(column),
      canPin: fixedColumnWidths,
      grouped: grid.groupBy.includes(column.id),
      canGroup: column.groupable !== false,
      setGrouped: (grouped) => grid.setGroupBy(grouped ? [...grid.groupBy.filter((id) => id !== column.id), column.id] : grid.groupBy.filter((id) => id !== column.id)),
      setSort: (direction) => grid.setSort(column.id, direction),
      setPin: (pin) => grid.setColumnPin(column.id, pin),
      setFilter: (value) => grid.setColumnFilter(column.id, value),
      hide: () => grid.setColumnHidden(column.id, true),
      isHidden: (columnId) => Boolean(grid.columnState.hidden[columnId]),
      setHidden: grid.setColumnHidden,
    }
    if (slots?.columnMenu) return slots.columnMenu(ctx)
    const visible = getColumnMenuItems(ctx, columnMenuItems ?? {})
    if (!Object.values(visible).some(Boolean)) return null
    return (
      <DataGridColumnMenu
        ctx={ctx}
        visible={visible}
        labels={mergedLabels}
        width={columnMenuWidth}
        className={cn(columnMenuClassName, classNames?.columnMenu)}
        triggerClassName={columnMenuTriggerClassName}
        align={columnMenuAlign}
        trigger={slots?.columnMenuTrigger?.(ctx)}
        extra={slots?.columnMenuExtra?.(ctx)}
      />
    )
  }

  const renderHeaderCell = (column: DataGridColumnDef<TRow>, variant: "table" | "grid") => (
    <DataGridHeaderCell
      key={column.id}
      variant={variant}
      column={column}
      grid={grid}
      sizing={sizing}
      slots={slots}
      canSort={canSort(column)}
      canResize={canResize(column)}
      resizeHandle={resizeHandle}
      resizeHandleClassName={resizeHandleClassName}
      resizeHandleStyle={resizeHandleStyle}
      autoFitOnDoubleClick={autoFitOnDoubleClick}
      // The virtual header is always pinned to the top of the viewport
      stickyHeader={variant === "grid" ? true : stickyHeader}
      stickyTop={variant === "grid" ? 0 : headerGroupDepth * headerGroupHeight}
      stickyDivider={stickyDivider}
      stickyOffset={stickyOffsets[column.id]}
      menu={renderMenu(column)}
      resizeLabel={mergedLabels.resizeColumn(column.header)}
      draggable={enableGroupPanel && column.groupable !== false && column.id !== SELECTION_COLUMN_ID}
    />
  )

  // One listener for every row and cell (rows are memoized and come and go as
  // the user scrolls): the clicked row and cell are found from the DOM
  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!onRowClick && !onCellClick) return
    const target = event.target as Element
    // A button, link or field inside the cell has its own click
    if (target.closest(INTERACTIVE_ELEMENTS)) return
    const rowElement = target.closest<HTMLElement>("[data-row-index]")
    if (!rowElement || !event.currentTarget.contains(rowElement)) return
    const index = Number(rowElement.dataset.rowIndex)
    const item = virtualized ? grid.display.item(index) : grid.pageItems?.[index]
    const row = item ? (item.kind === "row" ? item.row : undefined) : grid.result.rows[index]
    if (row === undefined) return
    const cellElement = target.closest<HTMLElement>("[data-column-id]")
    const columnId = cellElement && rowElement.contains(cellElement) ? cellElement.dataset.columnId : undefined
    // The checkbox column is for selecting, not for clicking through
    if (columnId === SELECTION_COLUMN_ID) return
    const column = columnId === undefined ? undefined : columns.find((candidate) => candidate.id === columnId)
    const rowId = getRowId?.(row, index)
    if (column) onCellClick?.({ row, index, rowId, event, column, value: column.accessor(row) })
    onRowClick?.({ row, index, rowId, event })
  }

  return (
    <DataGridStyleProvider classNames={classNames} styles={styles} bordered={bordered} rowClickable={Boolean(onRowClick)} cellClickable={Boolean(onCellClick)}>
      <div data-slot="data-grid" className={cn("flex flex-col gap-3", className, classNames?.root)} style={styles?.root}>
        {(enableSearch || slots?.toolbar) && <DataGridToolbar grid={grid} searchPlaceholder={searchPlaceholder} labels={mergedLabels} slots={slots} />}

        {enableGroupPanel && <DataGridGroupPanel grid={grid} labels={mergedLabels} slots={slots} />}

        <div className="relative">
          <div
            ref={scrollRef}
            data-slot="data-grid-scroll"
            onClick={onRowClick || onCellClick ? handleClick : undefined}
            aria-busy={loading || undefined}
            className={cn("group/grid relative @container overflow-auto rounded-md border [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]", classNames?.scroll)}
            style={{
              ...styles?.scroll,
              // A virtual spacer can be millions of px tall, so it always needs a cap
              // (while filling, the measured height replaces the cap)
              height: fillPx,
              maxHeight: fillPx === undefined ? ((virtualized ? (maxHeight ?? 400) : maxHeight) ?? undefined) : undefined,
              minHeight: stableHeight,
              overflowAnchor: "none",
            }}
          >
            {virtualized ? (
              <DataGridVirtualBody
                grid={grid}
                display={grid.display}
                leftColumns={leftColumns}
                midColumns={midColumns}
                rightColumns={rightColumns}
                columnOffsets={columnOffsets}
                totalWidth={totalWidth}
                sizing={sizing}
                stickyOffsets={stickyOffsets}
                stickyDivider={stickyDivider}
                window={virtual.window}
                metrics={virtual.metrics}
                bodyRef={virtual.bodyRef}
                placeholderRef={virtual.placeholderRef}
                rowHeight={rowHeight}
                headerHeight={headerHeight}
                headerGroupDepth={headerGroupDepth}
                headerGroupHeight={headerGroupHeight}
                renderHeaderCell={(column) => renderHeaderCell(column, "grid")}
                labels={mergedLabels}
                labelColumnId={labelColumnId}
                groupIndent={groupIndent}
                hideGroupedCells={hideGroupedCells}
                showFooterRow={enableFooterRow}
                selectionEnabled={enableRowSelection}
                skeleton={showSkeleton}
                rowClassName={rowClassName}
                getRowKey={getRowId}
                emptyContent={slots?.empty ? slots.empty(grid) : emptyMessage}
                columnCount={renderColumns.length}
                placeholder={virtualPlaceholder}
                slots={slots}
              />
            ) : (
              <DataGridTable
                grid={grid}
                columns={renderColumns}
                regions={{
                  left: leftColumns,
                  mid: midColumns,
                  right: rightColumns,
                }}
                sizing={sizing}
                stickyOffsets={stickyOffsets}
                stickyHeader={stickyHeader}
                stickyDivider={stickyDivider}
                fixedColumnWidths={fixedColumnWidths}
                totalWidth={totalWidth}
                headerGroupDepth={headerGroupDepth}
                headerGroupHeight={headerGroupHeight}
                renderHeaderCell={(column) => renderHeaderCell(column, "table")}
                labels={mergedLabels}
                slots={slots}
                rowClassName={rowClassName}
                getRowId={getRowId}
                selectionEnabled={enableRowSelection}
                skeleton={showSkeleton}
                skeletonRows={loadingRows ?? Math.min(pageSize, 10)}
                emptyContent={slots?.empty ? slots.empty(grid) : emptyMessage}
                labelColumnId={labelColumnId}
                groupIndent={groupIndent}
                hideGroupedCells={hideGroupedCells}
                showFooterRow={enableFooterRow}
              />
            )}
          </div>
          {loading && (
            <div
              data-slot="data-grid-loading"
              role="status"
              className={cn(
                "z-40 flex items-center justify-center rounded-md",
                // Skeleton rows already show loading; the overlay dims and blocks the old rows
                showOverlay ? "absolute inset-0 bg-background/60" : "sr-only"
              )}
            >
              {showOverlay && slots?.loadingOverlay ? slots.loadingOverlay(grid) : showOverlay ? <LoaderCircleIcon className="size-6 animate-spin text-muted-foreground" /> : null}
              <span className="sr-only">{mergedLabels.loading}</span>
            </div>
          )}
        </div>

        {(enablePagination || virtualized || enableRowSelection || slots?.footer) && (
          <DataGridFooter
            grid={grid}
            pageSizeOptions={pageSizeOptions}
            labels={mergedLabels}
            showSelection={enableRowSelection}
            showPagination={enablePagination && !virtualized}
            showRowCount={virtualized}
            loading={showSkeleton}
            slots={slots}
          />
        )}
      </div>
    </DataGridStyleProvider>
  )
}

/**
 * The grid, with its declarative parts attached:
 * `<DataGrid.Column>`, `<DataGrid.Toolbar>`, `<DataGrid.Empty>`, …
 */
export const DataGrid = Object.assign(DataGridRoot, { Column: DataGridColumn, ...SLOT_PARTS }) as typeof DataGridRoot & { Column: typeof DataGridColumn } & DataGridSlotParts
