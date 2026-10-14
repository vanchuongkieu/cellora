import { useRef, useState } from "react"
import { isSameEditValue } from "@cellora/core"

import type { DataGridCellEdit, DataGridColumnDef, DataGridEditResult } from "./types"
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect"

export interface DataGridEditingCell<TRow> {
  row: TRow
  /**
   * What identifies the row: its id from `getRowId`, else the row object. An id
   * keeps the editor on the right row when saving replaces the row object.
   */
  key: unknown
  columnId: string
  /** Position of the row in the current list */
  index: number
}

interface UseCellEditingOptions<TRow> {
  /** Master switch; nothing is editable while false */
  enabled: boolean
  /** What starts editing a cell (Enter / F2 always work). Defaults to "doubleClick". */
  trigger?: "doubleClick" | "click" | "none"
  /** Rows are keyed by this in the change payload (optional) */
  getRowId?: (row: TRow, index: number) => string
  /**
   * Persist an edit. Return false or throw to reject it (the editor stays open
   * and shows the message); return/resolve anything else to accept.
   */
  onCellEdit?: (edit: DataGridCellEdit<TRow>) => unknown
  /** Extra per-cell gate on top of `column.editable` */
  isCellEditable?: (ctx: { row: TRow; column: DataGridColumnDef<TRow> }) => boolean
  onEditingChange?: (cell: DataGridEditingCell<TRow> | null) => void
  /** Columns in display order, used to find the next cell on Tab */
  columns: readonly DataGridColumnDef<TRow>[]
}

/** Which cell is being edited, and how an edit is validated and saved. */
export function useCellEditing<TRow>({ enabled, trigger = "doubleClick", getRowId, onCellEdit, isCellEditable, onEditingChange, columns }: UseCellEditingOptions<TRow>) {
  const [cell, setCell] = useState<DataGridEditingCell<TRow> | null>(null)
  const [pending, setPending] = useState(false)
  // The open cell as of now (state lags behind inside async saves)
  const openCell = useRef<DataGridEditingCell<TRow> | null>(null)
  // Saves still running: checkbox cells save on every click, so several can
  // overlap, and `pending` must only clear once the last one is done
  const inFlight = useRef(0)
  // Callbacks may be new functions every render; keep the API itself stable
  const latest = useRef({ onCellEdit, getRowId, onEditingChange, columns })
  useIsomorphicLayoutEffect(() => {
    latest.current = { onCellEdit, getRowId, onEditingChange, columns }
  })

  const isEditable = (row: TRow, column: DataGridColumnDef<TRow>) => {
    if (!enabled) return false
    const editable = typeof column.editable === "function" ? column.editable(row) : Boolean(column.editable)
    return editable && (isCellEditable?.({ row, column }) ?? true)
  }

  const keyOf = (row: TRow, index: number): unknown => (latest.current.getRowId ? latest.current.getRowId(row, index) : row)

  const setEditing = (next: DataGridEditingCell<TRow> | null) => {
    openCell.current = next
    setCell(next)
    latest.current.onEditingChange?.(next)
  }

  /** Save a value for any cell (also used by always-on editors like checkboxes). */
  const apply = async (row: TRow, column: DataGridColumnDef<TRow>, index: number, value: unknown): Promise<DataGridEditResult> => {
    const previousValue = column.accessor(row)
    if (isSameEditValue(previousValue, value)) return { ok: true }
    if (inFlight.current++ === 0) setPending(true)
    try {
      const accepted = await latest.current.onCellEdit?.({
        row,
        rowId: latest.current.getRowId?.(row, index),
        index,
        columnId: column.id,
        column,
        value,
        previousValue,
      })
      return accepted === false ? { ok: false } : { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : undefined,
      }
    } finally {
      if (--inFlight.current === 0) setPending(false)
    }
  }

  return {
    trigger,
    /** The cell being edited, if any */
    cell,
    /** True while `onCellEdit` is still running */
    pending,
    isEditable,
    isEditing: (row: TRow, columnId: string, index: number) => cell !== null && cell.columnId === columnId && cell.key === keyOf(row, index),
    start: (row: TRow, column: DataGridColumnDef<TRow>, index: number) => {
      // Checkbox cells are always live; they never enter an edit state
      if (!isEditable(row, column) || column.editor === "checkbox") return
      setEditing({ row, key: keyOf(row, index), columnId: column.id, index })
    },
    cancel: () => setEditing(null),
    apply,
    /** Save the open editor's value and close it on success. */
    commit: async (value: unknown): Promise<DataGridEditResult> => {
      const current = cell
      if (!current) return { ok: true }
      const column = latest.current.columns.find((item) => item.id === current.columnId)
      if (!column) return { ok: true }
      const result = await apply(current.row, column, current.index, value)
      // Meanwhile the editor may have been cancelled or moved to another cell:
      // only close (and report) when ours is still the open one
      const open = openCell.current
      if (result.ok && open && open.key === current.key && open.columnId === current.columnId) setEditing(null)
      return result
    },
    /** Start editing the next (or previous) editable cell in the same row. */
    startAdjacent: (row: TRow, fromColumnId: string, index: number, direction: 1 | -1) => {
      const list = latest.current.columns
      const from = list.findIndex((column) => column.id === fromColumnId)
      for (let i = from + direction; i >= 0 && i < list.length; i += direction) {
        const column = list[i]
        if (isEditable(row, column) && column.editor !== "checkbox") {
          setEditing({
            row,
            key: keyOf(row, index),
            columnId: column.id,
            index,
          })
          return true
        }
      }
      return false
    },
  }
}
