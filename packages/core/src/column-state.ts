import type { DataGridColumn } from "./types"

/** Runtime column overrides: pin side and visibility, keyed by column id. */
export interface DataGridColumnState {
  /** "left" / "right" pins, false forces unpinned; absent = column default */
  pinned: Record<string, "left" | "right" | false>
  hidden: Record<string, boolean>
}

export function createColumnState(): DataGridColumnState {
  return { pinned: {}, hidden: {} }
}

export function setColumnPin(state: DataGridColumnState, columnId: string, pin: "left" | "right" | false): DataGridColumnState {
  return { ...state, pinned: { ...state.pinned, [columnId]: pin } }
}

export function setColumnHidden(state: DataGridColumnState, columnId: string, hidden: boolean): DataGridColumnState {
  return { ...state, hidden: { ...state.hidden, [columnId]: hidden } }
}

/**
 * Drop hidden columns, apply pin overrides and order columns so left pins come
 * first and right pins last (keeps sticky offsets visually correct).
 */
export function applyColumnState<TColumn extends Pick<DataGridColumn, "id" | "sticky">>(columns: readonly TColumn[], state: DataGridColumnState): TColumn[] {
  const resolved = columns
    .filter((column) => !state.hidden[column.id])
    .map((column) => {
      const override = state.pinned[column.id]
      if (override === undefined) return column
      return { ...column, sticky: override || undefined }
    })
  return [...resolved.filter((column) => column.sticky === "left"), ...resolved.filter((column) => !column.sticky), ...resolved.filter((column) => column.sticky === "right")]
}
