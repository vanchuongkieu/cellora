import { useMemo, type ReactNode } from "react"
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react"
import type { DataGridGroupItem } from "@cellora/core"

import { Checkbox } from "@/components/ui/checkbox"
import { SELECTION_COLUMN_ID } from "./selection-column"
import type { DataGridColumnDef, DataGridLabels, DataGridSlots } from "./types"
import type { DataGridApi } from "./use-data-grid"

/** Default aggregate text: numbers in the user's locale, up to 2 decimals. */
export function formatAggregate(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "number") return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
  return String(value)
}

interface GroupCellContext<TRow> {
  column: DataGridColumnDef<TRow>
  /** The column that carries the group label / "Total" text */
  isLabelColumn: boolean
  grid: DataGridApi<TRow>
  labels: DataGridLabels
  slots?: DataGridSlots<TRow>
  /** px of indent per nesting level */
  indent: number
}

function aggregateContent<TRow>({ column, slots }: GroupCellContext<TRow>, value: unknown, scope: "group" | "total"): ReactNode {
  if (value === undefined) return null
  if (slots?.aggregateCell) return slots.aggregateCell({ column, value, scope })
  if (column.aggregateCell) return column.aggregateCell(value, { scope, column })
  return formatAggregate(value)
}

/** Checkbox on a group header: checks / unchecks every row inside the group. */
function GroupCheckbox<TRow>({ group, ctx }: { group: DataGridGroupItem<TRow>; ctx: GroupCellContext<TRow> }) {
  const { grid, labels, slots } = ctx
  const { selectable, getStatus } = grid.selection
  // A group can hold most of a million rows: collect them once per group, and
  // count the checked ones only when the selection changes
  const rows = useMemo(() => selectable(group.getRows()), [selectable, group])
  const status = useMemo(() => getStatus(rows), [getStatus, rows])
  const onChange = (checked: boolean) => grid.selection.setMany(rows, checked)
  return (
    <div
      className="flex w-full justify-center"
      // The row toggles on click; the checkbox must not
      onClick={(event) => event.stopPropagation()}
    >
      {slots?.selectGroup ? (
        slots.selectGroup({ group, status, onChange })
      ) : (
        <Checkbox
          aria-label={labels.selectGroup}
          checked={status === "all" ? true : status === "some" ? "indeterminate" : false}
          disabled={rows.length === 0}
          onCheckedChange={(checked) => onChange(checked === true)}
        />
      )}
    </div>
  )
}

function GroupLabel<TRow>({ group, ctx }: { group: DataGridGroupItem<TRow>; ctx: GroupCellContext<TRow> }) {
  const { grid, labels, slots, indent } = ctx
  const groupColumn = grid.columns.find((column) => column.id === group.columnId)
  const valueText = group.value === null || group.value === undefined || group.value === "" ? labels.emptyGroup : String(group.value)
  const label = `${valueText} (${group.count.toLocaleString()})`

  return (
    <div className="flex min-w-0 items-center gap-1" style={{ paddingLeft: group.depth * indent }}>
      <button
        type="button"
        aria-expanded={group.expanded}
        aria-label={group.expanded ? labels.collapseGroup : labels.expandGroup}
        // The row toggles on click too; do not toggle twice
        onClick={(event) => {
          event.stopPropagation()
          grid.toggleGroup(group.key)
        }}
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-sm hover:bg-muted"
      >
        {slots?.groupIcon ? slots.groupIcon({ expanded: group.expanded }) : group.expanded ? <ChevronDownIcon className="size-4" /> : <ChevronRightIcon className="size-4" />}
      </button>
      <span className="truncate">{slots?.groupLabel ? slots.groupLabel({ group, column: groupColumn, label }) : label}</span>
    </div>
  )
}

/** What one column shows on a row-group header. */
export function renderGroupCellContent<TRow>(group: DataGridGroupItem<TRow>, ctx: GroupCellContext<TRow>): ReactNode {
  if (ctx.column.id === SELECTION_COLUMN_ID) return ctx.grid.selection.enabled ? <GroupCheckbox group={group} ctx={ctx} /> : null
  if (ctx.isLabelColumn) return <GroupLabel group={group} ctx={ctx} />
  return aggregateContent(ctx, group.aggregates[ctx.column.id], "group")
}

/** What one column shows on the total row. */
export function renderTotalCellContent<TRow>(totals: Record<string, unknown>, ctx: GroupCellContext<TRow>): ReactNode {
  if (ctx.isLabelColumn) return ctx.labels.total
  return aggregateContent(ctx, totals[ctx.column.id], "total")
}
