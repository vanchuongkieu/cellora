export type DataGridSelectionStatus = "none" | "some" | "all"

export function toggleRowSelection(selected: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(selected)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

/** Select or deselect many ids at once. Ids outside `ids` stay untouched. */
export function setRowsSelected(selected: ReadonlySet<string>, ids: readonly string[], value: boolean): Set<string> {
  const next = new Set(selected)
  for (const id of ids) {
    if (value) next.add(id)
    else next.delete(id)
  }
  return next
}

/**
 * Whether none, some or all of `ids` are selected. Empty `ids` is "none".
 * Given a Set, it counts from the smaller side: a few checked rows out of a
 * million cost a few lookups, not a million.
 */
export function getSelectionStatus(selected: ReadonlySet<string>, ids: readonly string[] | ReadonlySet<string>): DataGridSelectionStatus {
  const idSet = ids instanceof Set ? (ids as ReadonlySet<string>) : null
  const total = idSet ? idSet.size : (ids as readonly string[]).length
  if (total === 0 || selected.size === 0) return "none"
  let count = 0
  if (idSet && selected.size < idSet.size) {
    for (const id of selected) if (idSet.has(id)) count++
  } else {
    for (const id of ids) if (selected.has(id)) count++
  }
  return count === 0 ? "none" : count === total ? "all" : "some"
}
