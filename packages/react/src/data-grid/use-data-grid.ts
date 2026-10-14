import { useDeferredValue, useMemo, useRef, useState } from "react"
import {
  aggregateRows,
  applyColumnState,
  buildGroupTree,
  createColumnState,
  createInitialState,
  flattenGroupTree,
  processRows,
  setColumnFilter,
  setColumnHidden,
  setColumnPin,
  setSort,
  toggleSort,
  type DataGridColumnState,
  type DataGridResult,
  type DataGridRowItem,
  type DataGridSort,
  type DataGridState,
  type SearchOptions,
  type SortDirection,
} from "@cellora/core"

import { signatureOf, useStable } from "./stable"
import type { DataGridCellEdit, DataGridColumnDef, DataGridSelectionChange } from "./types"
import { useCellEditing, type DataGridEditingCell } from "./use-cell-editing"
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect"
import { useRowSelection } from "./use-row-selection"

/**
 * Sorting, search, filters and paging that an API does instead of the grid
 * ("server-side" mode): the grid keeps the state and reports every change,
 * `rows` is what the API returned for it.
 */
export interface DataGridServerOptions {
  /** `rows` are already sorted: the grid shows them as they are. */
  manualSorting?: boolean
  /** `rows` already match the search and column filters. */
  manualFiltering?: boolean
  /** `rows` are one page; `rowCount` tells the grid how many there are in all. */
  manualPagination?: boolean
  /** Total matching rows across all pages (with `manualPagination`). Defaults to `rows.length`. */
  rowCount?: number
}

/** The sort / search / filter / paging state, controlled or with initial values. */
export interface DataGridStateOptions {
  /** Controlled sort. */
  sort?: DataGridSort | null
  defaultSort?: DataGridSort | null
  /** Controlled search text. */
  filter?: string
  defaultFilter?: string
  /** Controlled per-column filters (by column id). */
  columnFilters?: Readonly<Record<string, string>>
  defaultColumnFilters?: Readonly<Record<string, string>>
  /** Controlled page (0-based). */
  pageIndex?: number
  defaultPageIndex?: number
  /**
   * Called with the whole state after every change the user makes (sort,
   * search, column filters, page, page size): the place to fetch from an API.
   */
  onStateChange?: (state: DataGridState) => void
}

interface UseDataGridOptions<TRow> extends DataGridServerOptions, DataGridStateOptions, SearchOptions<TRow> {
  rows: readonly TRow[]
  columns: readonly DataGridColumnDef<TRow>[]
  pageSize?: number
  /** When false every matching row is returned on a single page. Defaults to true. */
  paginate?: boolean
  /** Whether row selection is on (skips building id lookups otherwise). */
  selectionEnabled?: boolean
  /** Rows failing this cannot be checked. */
  isRowSelectable?: (row: TRow) => boolean
  /** Stable id per row; selection is keyed by it. Defaults to the row index. */
  getRowId?: (row: TRow, index: number) => string
  selectedRowIds?: readonly string[]
  defaultSelectedRowIds?: readonly string[]
  onSelectionChange?: (change: DataGridSelectionChange<TRow>) => void
  /** Column ids to group rows by, outermost first (controlled). */
  groupBy?: readonly string[]
  defaultGroupBy?: readonly string[]
  onGroupByChange?: (groupBy: readonly string[]) => void
  /** Whether groups start expanded. Defaults to false. */
  groupDefaultExpanded?: boolean
  /** Compute column totals over all matching rows (for the footer row). */
  computeTotals?: boolean
  /** Master switch for inline editing; columns opt in with `editable`. */
  enableEditing?: boolean
  editTrigger?: "doubleClick" | "click" | "none"
  onCellEdit?: (edit: DataGridCellEdit<TRow>) => unknown
  isCellEditable?: (ctx: { row: TRow; column: DataGridColumnDef<TRow> }) => boolean
  onEditingChange?: (cell: DataGridEditingCell<TRow> | null) => void
}

/** What the body renders, one entry per visible line (group header or row). */
export interface DataGridDisplay<TRow> {
  count: number
  /** Built on demand: cheap for a window of rows, nothing is allocated up front */
  item: (index: number) => DataGridRowItem<TRow> | undefined
}

const NO_TOTALS: Record<string, unknown> = {}

export function useDataGrid<TRow>({
  rows,
  columns,
  pageSize = 10,
  paginate = true,
  selectionEnabled = true,
  isRowSelectable,
  getRowId,
  selectedRowIds,
  defaultSelectedRowIds,
  onSelectionChange,
  groupBy: groupByProp,
  defaultGroupBy,
  onGroupByChange,
  groupDefaultExpanded = false,
  computeTotals = false,
  enableEditing = false,
  editTrigger,
  onCellEdit,
  isCellEditable,
  onEditingChange,
  sort: sortProp,
  defaultSort,
  filter: filterProp,
  defaultFilter,
  columnFilters: columnFiltersProp,
  defaultColumnFilters,
  pageIndex: pageIndexProp,
  defaultPageIndex,
  onStateChange,
  manualSorting = false,
  manualFiltering = false,
  manualPagination = false,
  rowCount,
  ignoreAccents,
  searchFilter,
}: UseDataGridOptions<TRow>) {
  const [columnState, setColumnState] = useState<DataGridColumnState>(createColumnState)
  const [internal, setInternal] = useState<DataGridState>(() => ({
    ...createInitialState(pageSize),
    sort: defaultSort ?? null,
    filter: defaultFilter ?? "",
    columnFilters: { ...defaultColumnFilters },
    pageIndex: defaultPageIndex ?? 0,
  }))
  // Controlled fields win over what the grid keeps itself
  const state = useMemo<DataGridState>(
    () => ({
      ...internal,
      ...(sortProp !== undefined && { sort: sortProp }),
      ...(filterProp !== undefined && { filter: filterProp }),
      ...(columnFiltersProp !== undefined && { columnFilters: columnFiltersProp as Record<string, string> }),
      ...(pageIndexProp !== undefined && { pageIndex: pageIndexProp }),
    }),
    [internal, sortProp, filterProp, columnFiltersProp, pageIndexProp]
  )
  // Every change starts from the state as of now (several in one event chain
  // each see the one before) and is reported whole, so a host can fetch for it
  const current = useRef(state)
  const latest = useRef(onStateChange)
  useIsomorphicLayoutEffect(() => {
    current.current = state
    latest.current = onStateChange
  })
  const update = (change: (prev: DataGridState) => DataGridState) => {
    const next = change(current.current)
    current.current = next
    setInternal(next)
    latest.current?.(next)
  }
  const [internalGroupBy, setInternalGroupBy] = useState<readonly string[]>(defaultGroupBy ?? [])
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const groupBy = groupByProp ?? internalGroupBy
  const grouping = groupBy.length > 0

  // The `pageSize` prop may change after mount; state only took its first value
  const [appliedPageSize, setAppliedPageSize] = useState(pageSize)
  if (appliedPageSize !== pageSize) {
    setAppliedPageSize(pageSize)
    setInternal((prev) => ({ ...prev, pageSize, pageIndex: 0 }))
  }

  /** Columns after hiding, pin overrides and pin ordering */
  const visibleColumns = useMemo(() => applyColumnState(columns, columnState), [columns, columnState])
  // Filtering, sorting, grouping and totals only read ids, accessors, `display`,
  // `aggregate` and the search / sort / filter hooks. Keyed on those, a parent
  // re-render that recreates the columns (inline cell renderers, JSX columns)
  // does not reprocess every row.
  const dataColumns = useStable(
    columns,
    signatureOf(
      columns.map((column) => [
        column.id,
        column.accessor,
        column.display,
        column.aggregate,
        column.searchable,
        column.searchValue,
        column.sortValue,
        column.compare,
        column.filterValue,
        column.filterMatch,
      ])
    )
  )
  const dataVisibleColumns = useMemo(() => applyColumnState(dataColumns, columnState), [dataColumns, columnState])
  // Typed text shows at once; filtering many rows follows in a background render
  const filter = useDeferredValue(state.filter)
  const columnFilters = useDeferredValue(state.columnFilters)
  const { sort, pageIndex, pageSize: currentPageSize } = state
  // Grouped rows are paged as lines (headers + rows), so group first, page after
  const pageAll = grouping || !paginate
  // An API that pages hands over one page: the grid never slices it, and the
  // total comes from `rowCount`
  const serverPaged = paginate && manualPagination
  const processed = useMemo(
    () =>
      processRows(
        rows,
        dataVisibleColumns,
        {
          sort,
          filter,
          columnFilters,
          pageIndex: pageAll ? 0 : pageIndex,
          pageSize: pageAll ? Number.MAX_SAFE_INTEGER : currentPageSize,
        },
        { manualSorting, manualFiltering, manualPagination: serverPaged && !grouping, rowCount, ignoreAccents, searchFilter }
      ),
    [
      rows,
      dataVisibleColumns,
      sort,
      filter,
      columnFilters,
      pageIndex,
      currentPageSize,
      pageAll,
      manualSorting,
      manualFiltering,
      serverPaged,
      grouping,
      rowCount,
      ignoreAccents,
      searchFilter,
    ]
  )
  // Two steps so opening / closing a group does not touch the data again:
  // the tree (bucketing + aggregates) only depends on the rows and grouping...
  const tree = useMemo(() => (grouping ? buildGroupTree(processed.matchedRows, dataColumns, groupBy) : null), [grouping, processed.matchedRows, dataColumns, groupBy])
  // ...and the visible lines only on which groups are open.
  const items = useMemo(() => {
    if (!tree) return null
    // groupBy named no known column: nothing to group by, show the rows
    if (tree.length === 0)
      return processed.matchedRows.map((row) => ({
        kind: "row" as const,
        row,
        depth: 0,
      }))
    return flattenGroupTree(tree, expandedGroups, groupDefaultExpanded)
  }, [tree, processed.matchedRows, expandedGroups, groupDefaultExpanded])

  /** Lines of the current page (grouped mode); null when not grouped */
  const pageItems = useMemo(() => {
    if (!items) return null
    // A server page is shown whole, grouped as it is
    if (!paginate || serverPaged) return items
    const size = Math.max(1, state.pageSize)
    const pageCount = Math.max(1, Math.ceil(items.length / size))
    const pageIndex = Math.min(Math.max(0, state.pageIndex), pageCount - 1)
    return items.length <= size ? items : items.slice(pageIndex * size, (pageIndex + 1) * size)
  }, [items, paginate, serverPaged, state.pageSize, state.pageIndex])

  const result: DataGridResult<TRow> = useMemo(() => {
    if (!items || !pageItems) return processed
    if (serverPaged) {
      // Pages are the API's: count them from its total, not from the lines shown
      const total = Math.max(processed.matchedRows.length, rowCount ?? 0)
      const pageCount = Math.max(1, Math.ceil(total / Math.max(1, state.pageSize)))
      return { rows: processed.matchedRows, matchedRows: processed.matchedRows, total, pageCount, pageIndex: Math.min(Math.max(0, state.pageIndex), pageCount - 1) }
    }
    const size = paginate ? Math.max(1, state.pageSize) : Math.max(1, items.length)
    const pageCount = Math.max(1, Math.ceil(items.length / size))
    return {
      // Data rows on this page; without paging that is every matching row
      rows: paginate ? pageItems.flatMap((item) => (item.kind === "row" ? [item.row] : [])) : processed.matchedRows,
      matchedRows: processed.matchedRows,
      total: items.length,
      pageCount,
      pageIndex: Math.min(Math.max(0, state.pageIndex), pageCount - 1),
    }
  }, [items, pageItems, processed, paginate, serverPaged, rowCount, state.pageSize, state.pageIndex])

  const display: DataGridDisplay<TRow> = useMemo(
    () =>
      items
        ? { count: items.length, item: (index) => items[index] }
        : {
            count: processed.matchedRows.length,
            item: (index) => {
              const row = processed.matchedRows[index]
              return row === undefined ? undefined : { kind: "row", row, depth: 0 }
            },
          },
    [items, processed.matchedRows]
  )

  const totals = useMemo(() => (computeTotals ? aggregateRows(processed.matchedRows, dataColumns) : NO_TOTALS), [computeTotals, processed.matchedRows, dataColumns])

  const selection = useRowSelection({
    enabled: selectionEnabled,
    isRowSelectable,
    rows,
    getRowId,
    selectedRowIds,
    defaultSelectedRowIds,
    onSelectionChange,
  })

  const editing = useCellEditing({
    enabled: enableEditing,
    trigger: editTrigger,
    getRowId,
    onCellEdit,
    isCellEditable,
    onEditingChange,
    columns: visibleColumns,
  })

  return {
    // React 19 (development builds only) diffs the props of every re-rendered
    // component into its Performance Track, walking plain objects and arrays a
    // few levels deep. Through this object it would reach the row arrays
    // (`result.rows`, a million entries) from every header cell, footer and body
    // and freeze for seconds on a data change. A tag makes it a non-plain
    // object, which the diff skips. No effect in production.
    [Symbol.toStringTag]: "DataGridApi" as const,
    state,
    result,
    columns,
    editing,
    visibleColumns,
    columnState,
    selection,
    groupBy,
    expandedGroups,
    groupDefaultExpanded,
    /** Lines to render when rows are grouped and paged; null otherwise */
    pageItems,
    /** Every line, for virtualized rendering */
    display,
    /** Aggregates over all matching rows (when `computeTotals`) */
    totals,
    setFilter: (filter: string) => update((prev) => ({ ...prev, filter, pageIndex: 0 })),
    setColumnFilter: (columnId: string, value: string) => update((prev) => setColumnFilter(prev, columnId, value)),
    toggleSort: (columnId: string) => update((prev) => toggleSort(prev, columnId)),
    setSort: (columnId: string, direction: SortDirection | null) => update((prev) => setSort(prev, columnId, direction)),
    setPageIndex: (pageIndex: number) => update((prev) => ({ ...prev, pageIndex })),
    setPageSize: (nextSize: number) => update((prev) => ({ ...prev, pageSize: nextSize, pageIndex: 0 })),
    setColumnPin: (columnId: string, pin: "left" | "right" | false) => setColumnState((prev) => setColumnPin(prev, columnId, pin)),
    setColumnHidden: (columnId: string, hidden: boolean) => setColumnState((prev) => setColumnHidden(prev, columnId, hidden)),
    setGroupBy: (next: readonly string[]) => {
      if (groupByProp === undefined) setInternalGroupBy(next)
      onGroupByChange?.(next)
      // Back to the first page (only a change: an API host must not refetch for nothing)
      if (current.current.pageIndex !== 0) update((prev) => ({ ...prev, pageIndex: 0 }))
    },
    /** Open or close one group (by its `key`) */
    toggleGroup: (key: string) =>
      setExpandedGroups((prev) => ({
        ...prev,
        [key]: !(prev[key] ?? groupDefaultExpanded),
      })),
  }
}

/** Everything a slot needs to read or drive the grid. */
export type DataGridApi<TRow> = ReturnType<typeof useDataGrid<TRow>>
