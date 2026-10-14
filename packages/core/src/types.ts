import type { DataGridEditorType } from "./editing"

export type SortDirection = "asc" | "desc"

/** Built-in aggregations, or a function receiving all values of the group. */
export type DataGridAggregate = "sum" | "avg" | "min" | "max" | "count" | ((values: readonly unknown[]) => unknown)

export interface DataGridColumn<TRow = unknown> {
  id: string
  header: string
  accessor: (row: TRow) => unknown
  /**
   * A column that is not data: actions (edit, delete), a drag handle, an icon.
   * It never takes part in search, filters, sorting, grouping, totals or
   * editing, and it needs no `accessor` (a column without one is a display
   * column already). Render it with `cell`.
   */
  display?: boolean
  /** Allow sorting by this column (needs the grid-level sorting switch on). */
  sortable?: boolean
  /**
   * The value to sort by, instead of the accessor's: e.g. a rank for a status
   * ("low" < "high"), a last name, a parsed number. Numbers and Dates sort by
   * value, strings in natural order.
   */
  sortValue?: (row: TRow) => unknown
  /**
   * Your own comparison of two rows for the ascending order (negative when
   * `a` comes first). The grid flips it for descending and keeps equal rows
   * in their original order. Wins over `sortValue`.
   */
  compare?: (a: TRow, b: TRow) => number
  /** Allow resizing this column. Defaults to true. */
  resizable?: boolean
  /** Offer a per-column filter. Defaults to true. */
  filterable?: boolean
  /** What the column filter matches against, instead of the accessor's value (e.g. a formatted date). */
  filterValue?: (row: TRow) => unknown
  /**
   * Your own column filter: called with the row and the typed text (trimmed),
   * instead of the built-in "value contains the text". Wins over `filterValue`.
   */
  filterMatch?: (row: TRow, text: string) => boolean
  /** Let the search box look at this column. Defaults to true. */
  searchable?: boolean
  /**
   * What the search box matches against for this column, instead of the
   * accessor's value: e.g. a formatted date, a label for a code, several
   * fields joined. Column filters and sorting still use the accessor.
   */
  searchValue?: (row: TRow) => unknown
  /** Allow hiding this column. Defaults to true. */
  hideable?: boolean
  /** Allow pinning this column from the menu. Defaults to true. */
  pinnable?: boolean
  /** Show the column menu. Defaults to true. */
  menu?: boolean
  /**
   * Label(s) of the column group(s) this column sits under in the header. A
   * string is one level; an array nests levels, outermost first. Adjacent
   * columns with the same label share one spanning header cell.
   */
  headerGroup?: string | readonly string[]
  /** Offer "group by this column" and allow row grouping on it. Defaults to true. */
  groupable?: boolean
  /** How to combine this column's values on group rows and the total row. */
  aggregate?: DataGridAggregate
  /**
   * Allow inline editing of this column's cells (needs the grid's editing
   * switch). A function decides per row. Defaults to not editable.
   */
  editable?: boolean | ((row: TRow) => boolean)
  /** Which editor to show. Defaults to "text". */
  editor?: DataGridEditorType
  /** Choices for the "select" editor. */
  editorOptions?: readonly { value: string; label: string }[]
  /** Turn the typed text into the cell value; defaults to the editor type's parser. */
  parseValue?: (input: string, row: TRow) => unknown
  /** Return a message to reject the new value (the editor stays open). */
  validate?: (value: unknown, row: TRow) => string | null | undefined
  /** Pin the column to a side while scrolling horizontally. Needs fixed widths. */
  sticky?: "left" | "right"
  align?: "left" | "right" | "center"
  /** Initial width in px. Columns are fixed-width; defaults to 160. */
  width?: number
  /** Lower bound in px when resizing. Defaults to 60. */
  minWidth?: number
  /** Upper bound in px when resizing. Unbounded by default. */
  maxWidth?: number
}

export interface DataGridSort {
  columnId: string
  direction: SortDirection
}

export interface DataGridState {
  sort: DataGridSort | null
  filter: string
  /** Per-column text filters, keyed by column id */
  columnFilters: Record<string, string>
  pageIndex: number
  pageSize: number
}

export interface DataGridResult<TRow> {
  /** Rows of the current page after filter + sort */
  rows: TRow[]
  /** Every row matching the filters, sorted, before pagination */
  matchedRows: TRow[]
  /** Row count after filtering, before pagination */
  total: number
  pageCount: number
  /** pageIndex clamped into the valid range */
  pageIndex: number
}
