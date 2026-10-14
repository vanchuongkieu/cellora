import type { ComponentType, CSSProperties, MouseEvent, ReactNode } from "react"
import type { DataGridColumn, DataGridGroupItem, SortDirection } from "@cellora/core"

import type { DataGridApi } from "./use-data-grid"
import type { DataGridAggregateComponentProps, DataGridCellComponentProps, DataGridHeaderComponentProps } from "./declarative"

/** One saved cell change, as handed to `onCellEdit`. */
export interface DataGridCellEdit<TRow> {
  row: TRow
  /** From `getRowId`, when given */
  rowId?: string
  /** Position of the row in the current list */
  index: number
  columnId: string
  column: DataGridColumnDef<TRow>
  value: unknown
  previousValue: unknown
}

export interface DataGridEditResult {
  ok: boolean
  /** Message to show when the edit was rejected */
  error?: string
}

/** What a custom editor (`column.editCell` / `slots.editCell`) works with. */
export interface DataGridEditCellContext<TRow> {
  row: TRow
  column: DataGridColumnDef<TRow>
  index: number
  /** The current cell value */
  value: unknown
  /** True while a previous save is still running */
  pending: boolean
  /** Save this value and close the editor (rejected values keep it open) */
  commit: (value: unknown) => Promise<DataGridEditResult>
  /** Close the editor without saving */
  cancel: () => void
}

export interface DataGridCellContext<TRow> {
  grid: DataGridApi<TRow>
  /** Index within the current page */
  index: number
}

export interface DataGridColumnDef<TRow> extends DataGridColumn<TRow> {
  /** Custom cell renderer. Falls back to String(accessor(row)). */
  cell?: (row: TRow, ctx: DataGridCellContext<TRow>) => ReactNode
  /**
   * Renders this column's aggregate on group rows and the total row.
   * Defaults to the number formatted for the user's locale.
   */
  aggregateCell?: (value: unknown, ctx: { scope: "group" | "total"; column: DataGridColumnDef<TRow> }) => ReactNode
  /** Custom editor for this column; replaces the built-in one. */
  editCell?: (ctx: DataGridEditCellContext<TRow>) => ReactNode
  /** Replaces the header label; sorting, menu and resize handle stay. */
  headerCell?: (ctx: { column: DataGridColumnDef<TRow>; sorted: SortDirection | null; grid: DataGridApi<TRow> }) => ReactNode
  /**
   * The cell as a component (hooks work inside). Ignored when `cell` is given.
   * Receives `row`, `value`, `index`, `column` and `grid` as props.
   */
  cellComponent?: ComponentType<DataGridCellComponentProps<TRow>>
  /** The header label as a component. Ignored when `headerCell` is given. */
  headerComponent?: ComponentType<DataGridHeaderComponentProps<TRow>>
  /** The aggregate as a component. Ignored when `aggregateCell` is given. */
  aggregateComponent?: ComponentType<DataGridAggregateComponentProps<TRow>>
  /** The editor as a component; receives the `editCell` context as props. Ignored when `editCell` is given. */
  editComponent?: ComponentType<DataGridEditCellContext<TRow>>
}

/**
 * A column as you write it: same as `DataGridColumnDef`, but `accessor` may be
 * left out. A column without an `accessor` (or with `display: true`) is a
 * display column: actions, icons, anything that is not data.
 */
export type DataGridColumnInput<TRow> = Omit<DataGridColumnDef<TRow>, "accessor"> & {
  accessor?: (row: TRow) => unknown
}

/** A click on a body row (not on a button, link or field inside it). */
export interface DataGridRowClick<TRow> {
  row: TRow
  /** Position in the list being shown (the page, or all rows when virtualized) */
  index: number
  /** From `getRowId`, when given */
  rowId?: string
  event: MouseEvent<HTMLElement>
}

/** A click on a body cell (not on a button, link or field inside it). */
export interface DataGridCellClick<TRow> extends DataGridRowClick<TRow> {
  column: DataGridColumnDef<TRow>
  /** The column's accessor applied to the row (undefined for display columns) */
  value: unknown
}

/** What the grid reports whenever the checked rows change. */
export interface DataGridSelectionChange<TRow> {
  /** Ids of every checked row, across all pages */
  selectedRowIds: string[]
  /** Checked rows that are present in the current `rows` */
  selectedRows: TRow[]
  count: number
}

export type DataGridColumnMenuItem = "sort" | "pin" | "group" | "filter" | "hide" | "manage"

/** Everything the column menu (default or custom) needs. */
export interface DataGridColumnMenuContext<TRow> {
  column: DataGridColumnDef<TRow>
  grid: DataGridApi<TRow>
  /** All configured columns, hidden ones included */
  columns: readonly DataGridColumnDef<TRow>[]
  sorted: SortDirection | null
  pinned: "left" | "right" | false
  filterValue: string
  canSort: boolean
  canPin: boolean
  /** Whether rows are grouped by this column */
  grouped: boolean
  canGroup: boolean
  setGrouped: (grouped: boolean) => void
  setSort: (direction: SortDirection | null) => void
  setPin: (pin: "left" | "right" | false) => void
  setFilter: (value: string) => void
  hide: () => void
  isHidden: (columnId: string) => boolean
  setHidden: (columnId: string, hidden: boolean) => void
}

/** Every user-facing string; override any of them (i18n). */
export interface DataGridLabels {
  columnMenu: string
  sortAsc: string
  sortDesc: string
  sortClear: string
  pinLeft: string
  pinRight: string
  unpin: string
  filter: string
  filterPlaceholder: string
  hideColumn: string
  manageColumns: string
  selectAll: string
  selectRow: string
  selected: (count: number) => string
  loading: string
  rowCount: (total: number) => string
  groupBy: string
  ungroup: string
  total: string
  expandGroup: string
  collapseGroup: string
  /** Shown for the group of rows whose value is empty */
  emptyGroup: string
  invalidNumber: string
  invalidDate: string
  selectGroup: string
  groupPanelHint: string
  /** aria-label of the button that stops grouping by a column */
  removeGroup: (header: string) => string
  /** Fallback when a save was rejected without a message */
  editFailed: string
  /** aria-label of a cell editor; receives the column header */
  editCell: (header: string) => string
  /** aria-label of the search box */
  searchRows: string
  /** Text before the "rows per page" select (also its aria-label) */
  rowsPerPage: string
  previousPage: string
  nextPage: string
  /** "Page 2 / 10"; `page` counts from 1 */
  pageIndicator: (page: number, pageCount: number) => string
  /** "11-20 of 57" */
  range: (from: number, to: number, total: number) => string
  /** aria-label of a column's resize handle; receives the column header */
  resizeColumn: (header: string) => string
}

/** Every part of the grid chrome can be replaced. All slots are optional. */
export interface DataGridSlots<TRow> {
  /** Replaces the whole toolbar (search box included). */
  toolbar?: (grid: DataGridApi<TRow>) => ReactNode
  /** Replaces just the search box inside the default toolbar. */
  search?: (grid: DataGridApi<TRow>) => ReactNode
  /**
   * Wraps or replaces a body row. `cells` are the default cells. In table mode
   * return a <tr>; when virtualized the row element is provided for you, so
   * return the node to put inside it (e.g. `<div className="contents">`).
   */
  row?: (ctx: { row: TRow; index: number; selected: boolean; cells: ReactNode }) => ReactNode
  /** Content shown when no row matches. */
  empty?: (grid: DataGridApi<TRow>) => ReactNode
  /** The cell of a column-group row above the headers (label spans its columns). */
  headerGroup?: (ctx: { label: string; level: number; columns: readonly DataGridColumnDef<TRow>[] }) => ReactNode
  /** The text of a row-group header, e.g. "Corn (8)". The chevron is separate. */
  groupLabel?: (ctx: {
    group: DataGridGroupItem<TRow>
    column: DataGridColumnDef<TRow> | undefined
    /** Default text: the value and the row count */
    label: string
  }) => ReactNode
  /** The expand / collapse icon of a row-group header. */
  groupIcon?: (ctx: { expanded: boolean }) => ReactNode
  /**
   * Wraps or replaces a row-group header. `cells` are the default cells. In
   * table mode return a <tr>; when virtualized return the node for inside the row.
   */
  groupRow?: (ctx: { group: DataGridGroupItem<TRow>; cells: ReactNode; toggle: () => void }) => ReactNode
  /** The checkbox on a group header that selects every row of the group. */
  selectGroup?: (ctx: { group: DataGridGroupItem<TRow>; status: "none" | "some" | "all"; onChange: (checked: boolean) => void }) => ReactNode
  /** Replaces the whole "drag a column here to group" bar. */
  groupPanel?: (grid: DataGridApi<TRow>) => ReactNode
  /** One chip in the group bar (a column the rows are grouped by). */
  groupChip?: (ctx: {
    column: DataGridColumnDef<TRow>
    /** Stop grouping by this column */
    remove: () => void
  }) => ReactNode
  /** Wraps or replaces the total row (same contract as `groupRow`). */
  footerRow?: (ctx: { totals: Record<string, unknown>; cells: ReactNode }) => ReactNode
  /** Any aggregate (group rows and total row), overriding `column.aggregateCell`. */
  aggregateCell?: (ctx: { column: DataGridColumnDef<TRow>; value: unknown; scope: "group" | "total" }) => ReactNode
  /**
   * Replaces the editor of any cell (returns null to keep the built-in one).
   * Call `ctx.commit(value)` to save and `ctx.cancel()` to close.
   */
  editCell?: (ctx: DataGridEditCellContext<TRow>) => ReactNode
  /** One placeholder cell while loading with the skeleton variant. */
  skeletonCell?: (ctx: { column: DataGridColumnDef<TRow>; rowIndex: number }) => ReactNode
  /** The spinner shown over the table while reloading existing rows. */
  loadingOverlay?: (grid: DataGridApi<TRow>) => ReactNode
  /** Replaces the whole column menu control (trigger + content). */
  columnMenu?: (ctx: DataGridColumnMenuContext<TRow>) => ReactNode
  /** Replaces just the icon inside the default menu button. */
  columnMenuTrigger?: (ctx: DataGridColumnMenuContext<TRow>) => ReactNode
  /** Extra entries appended to the default menu (use DropdownMenuItem-like nodes). */
  columnMenuExtra?: (ctx: DataGridColumnMenuContext<TRow>) => ReactNode
  /**
   * The visual of the column resize handle. Dragging and keyboard resizing stay
   * on the wrapper; style hover/drag states with `group-hover/resizer:` and
   * `group-active/resizer:`.
   */
  resizeHandle?: (ctx: { column: DataGridColumnDef<TRow>; width: number }) => ReactNode
  /** Sort indicator inside sortable headers. */
  sortIcon?: (direction: SortDirection | null) => ReactNode
  /** The header "select all" checkbox. */
  selectAll?: (ctx: { status: "none" | "some" | "all"; disabled: boolean; onChange: (checked: boolean) => void }) => ReactNode
  /** A row's checkbox. */
  selectRow?: (ctx: { row: TRow; checked: boolean; disabled: boolean; onChange: (checked: boolean) => void }) => ReactNode
  /** The "3 selected" text in the footer. */
  selectionSummary?: (ctx: DataGridSelectionChange<TRow> & { total: number }) => ReactNode
  /** Replaces the whole footer. */
  footer?: (grid: DataGridApi<TRow>) => ReactNode
  /** The "1,000,000 rows" text shown instead of the range when virtualized. */
  rowCount?: (ctx: { total: number }) => ReactNode
  /** The "1-10 of 57" text. */
  range?: (ctx: { from: number; to: number; total: number }) => ReactNode
  /** The "Rows per page" label + select. */
  pageSize?: (ctx: { pageSize: number; options: readonly number[]; onChange: (pageSize: number) => void }) => ReactNode
  /** The "Page 1 / 6" text. */
  pageIndicator?: (ctx: { pageIndex: number; pageCount: number }) => ReactNode
  /** The previous/next buttons. */
  pageNavigation?: (ctx: { pageIndex: number; pageCount: number; onPageChange: (pageIndex: number) => void }) => ReactNode
}

/** The parts of the grid that can be styled with `classNames` / `styles`. */
export type DataGridPart =
  /** Outer wrapper (same as `className`) */
  | "root"
  | "toolbar"
  /** The default search input */
  | "search"
  | "groupPanel"
  | "groupChip"
  /** The scrolling area with the border */
  | "scroll"
  /** The <table> (or the grid element when virtualized) */
  | "table"
  /** The header block */
  | "header"
  | "headerRow"
  | "headerCell"
  /** Cells of the column-group rows above the headers */
  | "headerGroup"
  | "row"
  /** Every cell: body, group and total rows */
  | "cell"
  | "groupRow"
  | "footerRow"
  /** The "No results" area */
  | "empty"
  /** Pagination, selection summary, row count */
  | "footer"
  | "columnMenu"

/** Extra classes per part. Merged after the defaults, so they win (tailwind-merge). */
export type DataGridClassNames = Partial<Record<DataGridPart, string>>

/** Inline style per part, for values a class cannot express. */
export type DataGridStyles = Partial<Record<DataGridPart, CSSProperties>>
