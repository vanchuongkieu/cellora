import { collator, compareValues, isNil } from "./compare"
import { foldAccents, hasAccents } from "./text"
import type { DataGridColumn, DataGridResult, DataGridState, SortDirection } from "./types"

export function createInitialState(pageSize = 10): DataGridState {
  return { sort: null, filter: "", columnFilters: {}, pageIndex: 0, pageSize }
}

/** Set an explicit sort (or null to clear it). */
export function setSort(state: DataGridState, columnId: string, direction: SortDirection | null): DataGridState {
  return {
    ...state,
    sort: direction ? { columnId, direction } : null,
    pageIndex: 0,
  }
}

/** Set one column's text filter; an empty value removes it. */
export function setColumnFilter(state: DataGridState, columnId: string, value: string): DataGridState {
  const columnFilters = { ...state.columnFilters }
  if (value) columnFilters[columnId] = value
  else delete columnFilters[columnId]
  return { ...state, columnFilters, pageIndex: 0 }
}

/** Cycle a column through asc -> desc -> unsorted. */
export function toggleSort(state: DataGridState, columnId: string): DataGridState {
  const current = state.sort
  let sort: DataGridState["sort"]
  if (!current || current.columnId !== columnId) {
    sort = { columnId, direction: "asc" }
  } else if (current.direction === "asc") {
    sort = { columnId, direction: "desc" }
  } else {
    sort = null
  }
  return { ...state, sort, pageIndex: 0 }
}

/**
 * Turn sort keys into plain numbers so sorting never touches strings or
 * collators per comparison. Numbers and Dates map to themselves; strings map
 * to their collation rank (sorted once per distinct value). Mixed or other
 * key types return null and use the generic comparator.
 */
function toSortRanks(keys: readonly unknown[]): Float64Array | null {
  const count = keys.length
  const ranks = new Float64Array(count)
  let kind: "number" | "string" | null = null

  for (let i = 0; i < count; i++) {
    const key = keys[i]
    if (isNil(key)) {
      ranks[i] = NaN
      continue
    }
    const keyKind = typeof key === "number" || key instanceof Date ? "number" : typeof key === "string" ? "string" : null
    if (!keyKind || (kind && kind !== keyKind)) return null
    kind = keyKind
    ranks[i] = key instanceof Date ? key.getTime() : (key as number)
  }
  if (kind !== "string") return ranks

  // Distinct strings: sort once, then rank (equal-collating strings share a rank)
  const unique = new Map<string, number>()
  for (let i = 0; i < count; i++) {
    const key = keys[i]
    if (typeof key === "string" && !unique.has(key)) unique.set(key, 0)
  }
  const distinct = [...unique.keys()].sort(collator.compare)
  let rank = 0
  distinct.forEach((value, index) => {
    if (index > 0 && collator.compare(distinct[index - 1], value) !== 0) rank++
    unique.set(value, rank)
  })
  for (let i = 0; i < count; i++) {
    const key = keys[i]
    if (typeof key === "string") ranks[i] = unique.get(key) as number
  }
  return ranks
}

/** A search term, lowercased (and accent-folded), and whether a number's text could contain it. */
interface Needle {
  text: string
  numbers: boolean
  /** Compare without accents ("nguyen" finds "Nguyễn") */
  fold: boolean
}

// What a number turns into as text: digits, sign, dot, exponent (or Infinity / NaN)
const NUMBER_TEXT = /^[-+.\de]+$/

function toNeedle(value: string, fold: boolean): Needle {
  const lower = value.trim().toLowerCase()
  const text = fold ? foldAccents(lower) : lower
  return { text, fold, numbers: NUMBER_TEXT.test(text) || "-infinity".includes(text) || "nan".includes(text) }
}

function matches(value: unknown, needle: Needle): boolean {
  if (isNil(value)) return false
  // Turning numbers into text is most of a search's cost; a term with letters
  // can never be inside one
  if (typeof value === "number" && !needle.numbers) return false
  const text = String(value).toLowerCase()
  if (text.includes(needle.text)) return true
  // Folding only when the plain text did not match and has accents to strip
  return needle.fold && hasAccents(text) && foldAccents(text).includes(needle.text)
}

/** What a column offers the search: its own text when given, else its value. */
const searchValueOf = <TRow>(column: DataGridColumn<TRow>, row: TRow) => (column.searchValue ? column.searchValue(row) : column.accessor(row))

/** Lowercased search and per-column terms of one filter pass. */
interface FilterTerms {
  filter: string
  columnFilters: Record<string, string>
}

/** Whether every row matching `next` also matched `prev`: each term only grew, none was dropped. */
function isNarrower(prev: FilterTerms, next: FilterTerms): boolean {
  return next.filter.includes(prev.filter) && Object.entries(prev.columnFilters).every(([id, text]) => (next.columnFilters[id] ?? "").includes(text))
}

/** How rows are matched against the search text and the column filters. */
export interface SearchOptions<TRow> {
  /**
   * Match without accents: "nguyen" finds "Nguyễn", "creme" finds "crème".
   * Applies to the search box and the column filters. Defaults to true.
   */
  ignoreAccents?: boolean
  /**
   * Your own search: called for every row with the trimmed search text,
   * instead of the built-in "some column contains the text". Column filters
   * still apply on top.
   */
  searchFilter?: (row: TRow, term: string) => boolean
}

interface FilterPass {
  columns: readonly DataGridColumn<never>[]
  count: number
  terms: FilterTerms
  fold: boolean
  matched: unknown[]
}

/**
 * The last filter pass per `rows` array. Typing on in a search box only
 * narrows it, so the next pass filters these matches instead of every row.
 * Assumes rows are not mutated in place (pass a new array on change).
 */
const lastFilter = new WeakMap<object, FilterPass>()

/** Rows matching the search (any data column) and every column filter, in input order. */
function filterRows<TRow>(rows: readonly TRow[], columns: readonly DataGridColumn<TRow>[], state: DataGridState, options: SearchOptions<TRow>): TRow[] {
  const fold = options.ignoreAccents ?? true
  // Display columns hold no data: search and filters never look at them
  const dataColumns = columns.filter((column) => !column.display)
  const searchColumns = dataColumns.filter((column) => column.searchable !== false)
  const term = state.filter.trim()
  const query = toNeedle(term, fold)
  const columnNeedles = dataColumns
    .map((column) => {
      const text = (state.columnFilters[column.id] ?? "").trim()
      const needle = toNeedle(text, fold)
      // Built-in: the (filter) value contains the text; custom: the column decides
      const test = column.filterMatch ? (row: TRow) => column.filterMatch!(row, text) : (row: TRow) => matches((column.filterValue ?? column.accessor)(row), needle)
      return { column, needle, test }
    })
    .filter(({ needle }) => needle.text)

  // Nothing to filter: reuse the input array instead of copying a million refs
  if (!term && columnNeedles.length === 0) return rows as TRow[]

  const terms: FilterTerms = {
    filter: query.text,
    columnFilters: Object.fromEntries(columnNeedles.map(({ column, needle }) => [column.id, needle.text])),
  }
  const { searchFilter } = options
  // A custom match need not narrow as the text grows: always start from every row
  const custom = Boolean(searchFilter) || columnNeedles.some(({ column }) => column.filterMatch)
  const last = custom ? undefined : lastFilter.get(rows)
  const source = last && last.columns === columns && last.count === rows.length && last.fold === fold && isNarrower(last.terms, terms) ? (last.matched as TRow[]) : rows
  const matchesSearch = !term
    ? () => true
    : searchFilter
      ? (row: TRow) => searchFilter(row, term)
      : (row: TRow) => searchColumns.some((column) => matches(searchValueOf(column, row), query))
  const matched = source.filter((row) => columnNeedles.every(({ test }) => test(row)) && matchesSearch(row))
  if (!custom) lastFilter.set(rows, { columns: columns as readonly DataGridColumn<never>[], count: rows.length, terms, fold, matched })
  return matched
}

/**
 * Which steps `processRows` leaves to the caller, for rows that an API
 * already filtered, sorted or paged ("manual" = done elsewhere).
 */
export interface ProcessOptions<TRow = unknown> extends SearchOptions<TRow> {
  /** `rows` already match the search and column filters: skip filtering */
  manualFiltering?: boolean
  /** `rows` are already in sort order: skip sorting */
  manualSorting?: boolean
  /** `rows` are one page: skip slicing; `rowCount` gives the total */
  manualPagination?: boolean
  /** Total matching rows across all pages (with `manualPagination`). Defaults to `rows.length`. */
  rowCount?: number
}

/** Filter, sort and paginate rows. Pure: no framework dependency. */
export function processRows<TRow>(rows: readonly TRow[], columns: readonly DataGridColumn<TRow>[], state: DataGridState, options: ProcessOptions<TRow> = {}): DataGridResult<TRow> {
  let result = options.manualFiltering ? (rows as TRow[]) : filterRows(rows, columns, state, options)

  const sortColumn = state.sort && !options.manualSorting ? columns.find((column) => column.id === state.sort?.columnId && !column.display) : undefined
  if (state.sort && sortColumn) {
    const factor = state.sort.direction === "asc" ? 1 : -1
    const count = result.length
    const order = new Uint32Array(count)
    for (let i = 0; i < count; i++) order[i] = i
    // Read each key once (not once per comparison), then sort row indices
    const keys = new Array<unknown>(count)
    const { compare, sortValue } = sortColumn
    if (!compare) {
      const keyOf = sortValue ?? sortColumn.accessor
      for (let i = 0; i < count; i++) keys[i] = keyOf(result[i])
    }

    const ranks = compare ? null : toSortRanks(keys)
    if (compare) {
      // The column's own comparison (equal rows keep their order)
      order.sort((left, right) => compare(result[left], result[right]) * factor || left - right)
    } else if (ranks) {
      // Fast path: numeric ranks (NaN = empty value, sinks to the bottom)
      order.sort((left, right) => {
        const a = ranks[left]
        const b = ranks[right]
        if (a !== a || b !== b) {
          if ((a !== a) !== (b !== b)) return a !== a ? 1 : -1
          return left - right
        }
        return (a - b) * factor || left - right
      })
    } else {
      order.sort((left, right) => {
        const a = keys[left]
        const b = keys[right]
        if (isNil(a) || isNil(b)) {
          if (isNil(a) !== isNil(b)) return isNil(a) ? 1 : -1
          return left - right
        }
        return compareValues(a, b) * factor || left - right
      })
    }
    const source = result
    result = new Array<TRow>(count)
    for (let i = 0; i < count; i++) result[i] = source[order[i]]
  }

  const matchedRows = result
  const pageSize = Math.max(1, state.pageSize)
  if (options.manualPagination) {
    // `rows` is the page the API returned; the total only it knows
    const total = Math.max(result.length, options.rowCount ?? 0)
    const pageCount = Math.max(1, Math.ceil(total / pageSize))
    return { rows: result, matchedRows, total, pageCount, pageIndex: Math.min(Math.max(0, state.pageIndex), pageCount - 1) }
  }
  const total = result.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const pageIndex = Math.min(Math.max(0, state.pageIndex), pageCount - 1)
  // Everything fits on one page (e.g. virtual scrolling): no copy needed
  if (pageSize < total) {
    result = result.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
  }

  return { rows: result, matchedRows, total, pageCount, pageIndex }
}
