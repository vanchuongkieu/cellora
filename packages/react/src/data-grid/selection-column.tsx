import { useMemo } from "react"

import { Checkbox } from "@/components/ui/checkbox"

import type { DataGridColumnDef, DataGridLabels, DataGridSlots } from "./types"
import type { DataGridApi } from "./use-data-grid"

export type DataGridSelectAllScope = "page" | "all"

/** Id of the checkbox column; it never takes part in grouping or totals. */
export const SELECTION_COLUMN_ID = "__select__"

interface SelectionColumnOptions<TRow> {
  pinned: boolean
  scope: DataGridSelectAllScope
  isRowSelectable?: (row: TRow) => boolean
  labels: DataGridLabels
  slots?: DataGridSlots<TRow>
}

/**
 * The checkbox column. It is built next to the grid (not part of `columns`),
 * so it never shows up in the column menu, filters or search.
 */
export function createSelectionColumn<TRow>({ pinned, scope, isRowSelectable, labels, slots }: SelectionColumnOptions<TRow>): DataGridColumnDef<TRow> {
  const selectable = (row: TRow) => isRowSelectable?.(row) ?? true

  return {
    id: SELECTION_COLUMN_ID,
    header: labels.selectAll,
    accessor: () => undefined,
    width: 44,
    minWidth: 44,
    maxWidth: 44,
    align: "center",
    resizable: false,
    filterable: false,
    hideable: false,
    pinnable: false,
    menu: false,
    sticky: pinned ? "left" : undefined,
    headerCell: ({ grid }) => <SelectAll grid={grid} scope={scope} labels={labels} slots={slots} />,
    cell: (row, { grid }) => {
      const checked = grid.selection.isSelected(row)
      const disabled = !selectable(row)
      const onChange = (next: boolean) => grid.selection.setMany([row], next)

      // A block-level checkbox ignores the cell's text-align, so center it with
      // flex, the same way the header cell centers its label.
      return (
        <div className="flex justify-center">
          {slots?.selectRow ? (
            slots.selectRow({ row, checked, disabled, onChange })
          ) : (
            <Checkbox aria-label={labels.selectRow} checked={checked} disabled={disabled} onCheckedChange={(next) => onChange(next === true)} />
          )}
        </div>
      )
    },
  }
}

interface SelectAllProps<TRow> {
  grid: DataGridApi<TRow>
  scope: DataGridSelectAllScope
  labels: DataGridLabels
  slots?: DataGridSlots<TRow>
}

function SelectAll<TRow>({ grid, scope, labels, slots }: SelectAllProps<TRow>) {
  // "page" = rows on screen, "all" = every row matching the filters.
  // Scanning a million rows is not free: collect the checkable rows only when
  // the rows or the `isRowSelectable` rule change (`selectable` is stable
  // while the rule is), and recount the status only when the selection does.
  const source = scope === "all" ? grid.result.matchedRows : grid.result.rows
  const { selectable, getStatus } = grid.selection
  const targets = useMemo(() => selectable(source), [selectable, source])
  const status = useMemo(() => getStatus(targets), [getStatus, targets])
  const disabled = targets.length === 0
  const onChange = (checked: boolean) => grid.selection.setMany(targets, checked)

  return slots?.selectAll ? (
    slots.selectAll({ status, disabled, onChange })
  ) : (
    <Checkbox
      aria-label={labels.selectAll}
      checked={status === "all" ? true : status === "some" ? "indeterminate" : false}
      disabled={disabled}
      onCheckedChange={(checked) => onChange(checked === true)}
    />
  )
}
