import { useCallback, useMemo, useState } from "react"
import { getSelectionStatus, setRowsSelected, toggleRowSelection } from "@cellora/core"

import type { DataGridSelectionChange } from "./types"

interface UseRowSelectionOptions<TRow> {
  /**
   * Row selection is off by default; building the id lookup for a huge `rows`
   * array is skipped unless this is true.
   */
  enabled?: boolean
  /** Rows that fail this cannot be checked (also skipped by group / select-all) */
  isRowSelectable?: (row: TRow) => boolean
  rows: readonly TRow[]
  /**
   * Stable id per row. Defaults to the row's index in `rows`. Read once per
   * `rows` array, so an inline function does not rebuild the lookup.
   */
  getRowId?: (row: TRow, index: number) => string
  /** Controlled selection. Omit for uncontrolled. */
  selectedRowIds?: readonly string[]
  defaultSelectedRowIds?: readonly string[]
  onSelectionChange?: (change: DataGridSelectionChange<TRow>) => void
}

/**
 * Change payloads per selection set: the one sent to `onSelectionChange` is
 * reused by the render that follows instead of scanning every row again.
 */
const described = new WeakMap<ReadonlySet<string>, { ids: Map<unknown, string>; change: DataGridSelectionChange<unknown> }>()

/**
 * Id sets per id lookup and target list. Select-all and group checkboxes keep
 * their row list stable, so only a selection change costs anything after that.
 */
const idSets = new WeakMap<Map<unknown, string>, WeakMap<readonly unknown[], ReadonlySet<string>>>()

/** Position of each id in `rows`, per id lookup (built the first time a few rows are checked). */
const positions = new WeakMap<Map<unknown, string>, Map<string, number>>()

/** The checked rows in data order. */
function selectedRowsOf<TRow>(rows: readonly TRow[], ids: Map<TRow, string>, set: ReadonlySet<string>): TRow[] {
  if (set.size === 0) return []
  // Many checked: one pass over the rows beats sorting that many positions
  if (set.size * 16 > rows.length) return rows.filter((row) => set.has(ids.get(row) ?? ""))
  let byId = positions.get(ids)
  if (!byId) {
    const map = new Map<string, number>()
    rows.forEach((row, index) => map.set(ids.get(row) ?? "", index))
    positions.set(ids, (byId = map))
  }
  const found: number[] = []
  for (const id of set) {
    const index = byId.get(id)
    if (index !== undefined) found.push(index)
  }
  return found.sort((a, b) => a - b).map((index) => rows[index])
}

function idSetOf<TRow>(ids: Map<TRow, string>, targets: readonly TRow[]): ReadonlySet<string> {
  let byTargets = idSets.get(ids)
  if (!byTargets) idSets.set(ids, (byTargets = new WeakMap()))
  let set = byTargets.get(targets)
  if (!set) byTargets.set(targets, (set = new Set(targets.map((row) => ids.get(row) ?? ""))))
  return set
}

/**
 * Row selection keyed by row id, so it survives paging, sorting and
 * filtering. Rows must be objects (they are looked up by identity).
 */
export function useRowSelection<TRow>({ enabled = true, isRowSelectable, rows, getRowId, selectedRowIds, defaultSelectedRowIds, onSelectionChange }: UseRowSelectionOptions<TRow>) {
  const controlled = selectedRowIds !== undefined
  const [internal, setInternal] = useState<ReadonlySet<string>>(() => new Set(defaultSelectedRowIds))
  const selected = useMemo<ReadonlySet<string>>(() => (controlled ? new Set(selectedRowIds) : internal), [controlled, selectedRowIds, internal])

  const ids = useMemo(
    () => (!enabled ? new Map<TRow, string>() : new Map(rows.map((row, index) => [row, getRowId ? getRowId(row, index) : String(index)] as const))),
    // getRowId is left out on purpose: it is usually an inline function, and
    // rebuilding the lookup on every render costs a pass over all rows
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled, rows]
  )
  const idOf = useCallback((row: TRow) => ids.get(row) ?? "", [ids])

  const describe = (set: ReadonlySet<string>): DataGridSelectionChange<TRow> => {
    const hit = described.get(set)
    if (hit && hit.ids === ids) return hit.change as DataGridSelectionChange<TRow>
    const change: DataGridSelectionChange<TRow> = {
      selectedRowIds: [...set],
      selectedRows: selectedRowsOf(rows, ids, set),
      count: set.size,
    }
    described.set(set, { ids, change: change as DataGridSelectionChange<unknown> })
    return change
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- describe only reads these
  const current = useMemo(() => describe(selected), [selected, rows, ids])

  const commit = (next: Set<string>) => {
    if (!controlled) setInternal(next)
    onSelectionChange?.(describe(next))
  }

  // Stable while their inputs are, so callers can memoize on them
  const selectable = useCallback((targets: readonly TRow[]) => (isRowSelectable ? targets.filter(isRowSelectable) : targets), [isRowSelectable])
  const getStatus = useCallback((targets: readonly TRow[]) => getSelectionStatus(selected, idSetOf(ids, targets)), [selected, ids])

  return {
    ...current,
    enabled,
    /** The rows of `targets` that may be checked */
    selectable,
    getRowId: idOf,
    isSelected: (row: TRow) => selected.has(idOf(row)),
    toggle: (row: TRow) => commit(toggleRowSelection(selected, idOf(row))),
    /** Check or uncheck many rows at once; other rows keep their state. */
    setMany: (targets: readonly TRow[], value: boolean) => commit(setRowsSelected(selected, targets.map(idOf), value)),
    clear: () => commit(new Set()),
    getStatus,
  }
}
