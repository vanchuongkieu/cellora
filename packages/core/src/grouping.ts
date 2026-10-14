import { compareValues, isNil } from "./compare"
import type { DataGridColumn } from "./types"

export interface DataGridDataItem<TRow> {
  kind: "row"
  row: TRow
  /** Nesting level: how many groups this row sits under */
  depth: number
}

export interface DataGridGroupItem<TRow = unknown> {
  kind: "group"
  /** Unique, stable path key (use it to expand / collapse) */
  key: string
  depth: number
  /** Column this group level is built from */
  columnId: string
  /** The shared value of the grouped column */
  value: unknown
  /** Number of data rows inside, nested groups included */
  count: number
  expanded: boolean
  /** Aggregated values by column id, for columns that define `aggregate` */
  aggregates: Record<string, unknown>
  /**
   * Every data row inside, nested groups included (collected on demand: cheap
   * to carry, only costs when called, e.g. to select a whole group).
   */
  getRows: () => TRow[]
}

export type DataGridRowItem<TRow> = DataGridDataItem<TRow> | DataGridGroupItem<TRow>

const SEPARATOR = "\u001f"

/** Groups in the order a sort on the column would give, empty values last. */
function compareGroupValues(a: unknown, b: unknown): number {
  if (isNil(a) || isNil(b)) return Number(isNil(a)) - Number(isNil(b))
  return compareValues(a, b)
}

/** Aggregate one column over rows. Builtins run in a single pass, no copies. */
function aggregateColumn<TRow>(rows: readonly TRow[], column: DataGridColumn<TRow>): unknown {
  const kind = column.aggregate
  if (!kind) return undefined
  if (typeof kind === "function") return kind(rows.map(column.accessor))

  let count = 0
  let sum = 0
  let min = Infinity
  let max = -Infinity
  for (const row of rows) {
    const value = column.accessor(row)
    if (isNil(value)) continue
    if (kind === "count") {
      count++
      continue
    }
    const number = typeof value === "number" ? value : value instanceof Date ? value.getTime() : Number(value)
    if (Number.isNaN(number)) continue
    count++
    sum += number
    if (number < min) min = number
    if (number > max) max = number
  }
  switch (kind) {
    case "count":
      return count
    case "sum":
      return sum
    case "avg":
      return count ? sum / count : null
    case "min":
      return count ? min : null
    case "max":
      return count ? max : null
  }
}

/** Aggregates for every column that defines `aggregate`, keyed by column id. */
export function aggregateRows<TRow>(rows: readonly TRow[], columns: readonly DataGridColumn<TRow>[]): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const column of columns) {
    if (column.aggregate) result[column.id] = aggregateColumn(rows, column)
  }
  return result
}

/** A group of rows, built once per data / grouping change (see `buildGroupTree`). */
export interface DataGridGroupNode<TRow> {
  key: string
  depth: number
  columnId: string
  value: unknown
  count: number
  aggregates: Record<string, unknown>
  /** Nested groups, or null on the last level */
  groups: DataGridGroupNode<TRow>[] | null
  /** The rows, on the last level only */
  rows: TRow[] | null
}

/**
 * Bucket rows into a tree of groups and compute their aggregates. This is the
 * expensive step (one pass per level over all rows) so do it once and reuse the
 * tree while groups are opened and closed (`flattenGroupTree`).
 */
export function buildGroupTree<TRow>(rows: readonly TRow[], columns: readonly DataGridColumn<TRow>[], groupBy: readonly string[]): DataGridGroupNode<TRow>[] {
  const groupColumns = groupBy.map((id) => columns.find((column) => column.id === id)).filter((column): column is DataGridColumn<TRow> => Boolean(column))
  if (groupColumns.length === 0) return []

  const build = (source: readonly TRow[], level: number, parentKey: string): DataGridGroupNode<TRow>[] => {
    const column = groupColumns[level]
    const buckets = new Map<string, { value: unknown; rows: TRow[] }>()
    for (const row of source) {
      const value = column.accessor(row)
      const key = isNil(value) ? "" : String(value)
      const bucket = buckets.get(key)
      if (bucket) bucket.rows.push(row)
      else buckets.set(key, { value, rows: [row] })
    }
    const last = level === groupColumns.length - 1
    return [...buckets.entries()]
      .sort(([, a], [, b]) => compareGroupValues(a.value, b.value))
      .map(([key, bucket]) => {
        const groupKey = `${parentKey}${SEPARATOR}${column.id}=${key}`
        return {
          key: groupKey,
          depth: level,
          columnId: column.id,
          value: bucket.value,
          count: bucket.rows.length,
          aggregates: aggregateRows(bucket.rows, columns),
          groups: last ? null : build(bucket.rows, level + 1, groupKey),
          rows: last ? bucket.rows : null,
        }
      })
  }
  return build(rows, 0, "")
}

/** All data rows of a node, depth-first. */
function collectRows<TRow>(node: DataGridGroupNode<TRow>): TRow[] {
  if (node.rows) return node.rows
  return (node.groups ?? []).flatMap(collectRows)
}

/**
 * The visible lines for a group tree: every group header, plus the rows and
 * sub-groups of the groups that are expanded. Cheap: no pass over the data.
 */
export function flattenGroupTree<TRow>(tree: readonly DataGridGroupNode<TRow>[], expanded: Readonly<Record<string, boolean>>, defaultExpanded = false): DataGridRowItem<TRow>[] {
  const items: DataGridRowItem<TRow>[] = []
  const visit = (nodes: readonly DataGridGroupNode<TRow>[]) => {
    for (const node of nodes) {
      const open = expanded[node.key] ?? defaultExpanded
      items.push({
        kind: "group",
        key: node.key,
        depth: node.depth,
        columnId: node.columnId,
        value: node.value,
        count: node.count,
        expanded: open,
        aggregates: node.aggregates,
        getRows: () => collectRows(node),
      })
      if (!open) continue
      if (node.groups) visit(node.groups)
      else if (node.rows) for (const row of node.rows) items.push({ kind: "row", row, depth: node.depth + 1 })
    }
  }
  visit(tree)
  return items
}

/**
 * Flatten rows into group headers and (for expanded groups) their rows.
 * Groups are ordered by value; rows keep the order they came in, so a prior
 * sort still applies inside every group. Convenience over `buildGroupTree` +
 * `flattenGroupTree`; prefer those two when groups are toggled often.
 */
export function groupRows<TRow>(
  rows: readonly TRow[],
  columns: readonly DataGridColumn<TRow>[],
  options: {
    /** Column ids to group by, outermost first. Unknown ids are skipped. */
    groupBy: readonly string[]
    /** Expanded state by group key; missing keys use `defaultExpanded` */
    expanded: Readonly<Record<string, boolean>>
    defaultExpanded?: boolean
  }
): DataGridRowItem<TRow>[] {
  const tree = buildGroupTree(rows, columns, options.groupBy)
  if (tree.length === 0) {
    return rows.map((row) => ({ kind: "row" as const, row, depth: 0 }))
  }
  return flattenGroupTree(tree, options.expanded, options.defaultExpanded)
}
