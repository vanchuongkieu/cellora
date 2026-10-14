import type { HTMLAttributes, ReactNode } from "react"
import { cn } from "cn"

import { Checkbox } from "@/components/ui/checkbox"

import { DataGridCellEditor } from "./data-grid-cell-editor"
import type { DataGridColumnDef, DataGridLabels, DataGridSlots } from "./types"
import type { DataGridApi } from "./use-data-grid"

interface CellContentOptions<TRow> {
  row: TRow
  column: DataGridColumnDef<TRow>
  index: number
  grid: DataGridApi<TRow>
  labels: DataGridLabels
  slots?: DataGridSlots<TRow>
  /** Leave the cell empty (the grouped column on data rows) */
  hidden?: boolean
}

/** What a body cell shows: the editor, a live checkbox, or the value. */
export function renderCellContent<TRow>({ row, column, index, grid, labels, slots, hidden }: CellContentOptions<TRow>): ReactNode {
  if (hidden) return null
  const { editing } = grid

  if (editing.isEditable(row, column)) {
    // Checkboxes save on every click; no separate edit state
    if (column.editor === "checkbox") {
      return (
        <div className={cn("flex w-full", column.align === "center" && "justify-center", column.align === "right" && "justify-end")}>
          <Checkbox
            aria-label={labels.editCell(column.header)}
            checked={Boolean(column.accessor(row))}
            disabled={editing.pending}
            onCheckedChange={(next) => void editing.apply(row, column, index, next === true)}
          />
        </div>
      )
    }
    if (editing.isEditing(row, column.id, index)) {
      return <DataGridCellEditor row={row} column={column} index={index} grid={grid} labels={labels} slots={slots} />
    }
  }
  return column.cell ? column.cell(row, { grid, index }) : String(column.accessor(row) ?? "")
}

/**
 * Attributes that make a cell editable: how editing starts (double-click,
 * click, Enter / F2 from the keyboard). Undefined when the cell is not editable.
 */
export function getCellEditProps<TRow>(
  grid: DataGridApi<TRow>,
  row: TRow,
  column: DataGridColumnDef<TRow>,
  index: number
):
  | (HTMLAttributes<HTMLElement> & {
      "data-editable"?: boolean
      "data-editing"?: boolean
    })
  | undefined {
  const { editing } = grid
  if (!editing.isEditable(row, column)) return undefined
  // Checkboxes and the open editor handle their own events
  if (column.editor === "checkbox") return { "data-editable": true }
  // The open editor fills the cell; `data-editing` drops the cell's padding
  if (editing.isEditing(row, column.id, index)) return { "data-editable": true, "data-editing": true }
  const start = () => editing.start(row, column, index)
  return {
    "data-editable": true,
    tabIndex: -1,
    onDoubleClick: editing.trigger === "doubleClick" ? start : undefined,
    onClick: editing.trigger === "click" ? start : undefined,
    onKeyDown: (event) => {
      // Only keys pressed on the cell itself, not on something inside it
      if (event.target !== event.currentTarget) return
      if (event.key === "Enter" || event.key === "F2") {
        event.preventDefault()
        start()
      }
    },
  }
}

/**
 * Classes every body cell carries for editing: a keyboard focus ring on
 * editable cells, and no padding while the editor is open (the editor is
 * positioned over the whole cell, so the cell and row keep their size).
 * `relative` is what the editor is positioned against; pinned cells are
 * already `sticky`, which positions them too.
 */
export const EDITABLE_CELL_CLASS =
  "relative data-editable:outline-none data-editable:focus-visible:ring-1 data-editable:focus-visible:ring-inset data-editable:focus-visible:ring-ring data-editing:p-0"
