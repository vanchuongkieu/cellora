import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { formatEditValue, parseEditInput } from "@cellora/core"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import type { DataGridColumnDef, DataGridEditCellContext, DataGridLabels, DataGridSlots } from "./types"
import type { DataGridApi } from "./use-data-grid"

interface DataGridCellEditorProps<TRow> {
  row: TRow
  column: DataGridColumnDef<TRow>
  index: number
  grid: DataGridApi<TRow>
  labels: DataGridLabels
  slots?: DataGridSlots<TRow>
}

/** The editor of the cell being edited: custom (column / slot) or built-in. */
export function DataGridCellEditor<TRow>(props: DataGridCellEditorProps<TRow>) {
  const { row, column, index, grid, slots } = props
  const ctx: DataGridEditCellContext<TRow> = {
    row,
    column,
    index,
    value: column.accessor(row),
    pending: grid.editing.pending,
    commit: grid.editing.commit,
    cancel: grid.editing.cancel,
  }
  const custom = column.editCell ? column.editCell(ctx) : slots?.editCell?.(ctx)
  return (
    // Absolute: the editor covers the whole cell and adds nothing to the row's
    // height or the column's width, whatever it contains
    <div data-slot="data-grid-cell-editor" className="absolute inset-0 flex items-stretch bg-background">
      {custom !== null && custom !== undefined ? custom : <BuiltInEditor {...props} />}
    </div>
  )
}

/** Form-field look that fills its cell edge to edge. */
const FIELD_CLASS =
  "h-full w-full min-w-0 flex-1 rounded-none border-0 bg-transparent px-2 shadow-none ring-2 ring-inset ring-ring focus-visible:border-0 focus-visible:ring-2 aria-invalid:ring-destructive aria-busy:opacity-60"

function BuiltInEditor<TRow>({ row, column, index, grid, labels }: DataGridCellEditorProps<TRow>) {
  const type = column.editor ?? "text"
  const initial = column.accessor(row)
  const [text, setText] = useState(() => formatEditValue(type, initial))
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  // Enter, Tab and blur can all fire for one edit; only the first one saves
  const settled = useRef(false)
  const { editing } = grid

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  /** Validate, save, and optionally continue to the neighbouring cell. */
  const submit = async (move?: 1 | -1, override?: string): Promise<boolean> => {
    if (settled.current) return true
    const input = override ?? text
    const parsed = parseEditInput(type, input)
    if (!column.parseValue && parsed.error) {
      setError(parsed.error === "invalid-number" ? labels.invalidNumber : labels.invalidDate)
      return false
    }
    const value = column.parseValue ? column.parseValue(input, row) : parsed.value
    const message = column.validate?.(value, row)
    if (message) {
      setError(message)
      return false
    }
    settled.current = true
    const result = await editing.commit(value)
    if (!result.ok) {
      settled.current = false
      setError(result.error ?? labels.editFailed)
      return false
    }
    if (move) editing.startAdjacent(row, column.id, index, move)
    return true
  }

  const cancel = () => {
    settled.current = true
    editing.cancel()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation()
    if (event.key === "Enter") {
      event.preventDefault()
      void submit()
    } else if (event.key === "Escape") {
      event.preventDefault()
      cancel()
    } else if (event.key === "Tab") {
      event.preventDefault()
      void submit(event.shiftKey ? -1 : 1)
    }
  }

  if (type === "select") {
    return (
      <Select
        defaultOpen
        value={text}
        disabled={editing.pending}
        onValueChange={(next) => {
          setText(next)
          void submit(undefined, next)
        }}
        onOpenChange={(open) => {
          if (!open && !settled.current) cancel()
        }}
      >
        <SelectTrigger
          size="sm"
          className={`${FIELD_CLASS} data-[size=sm]:h-full data-[size=default]:h-full justify-between`}
          aria-label={labels.editCell(column.header)}
          aria-invalid={error ? true : undefined}
          title={error ?? undefined}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(column.editorOptions ?? []).map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <>
      <Input
        ref={inputRef}
        type={type === "number" ? "number" : type === "date" ? "date" : "text"}
        value={text}
        readOnly={editing.pending}
        aria-busy={editing.pending || undefined}
        aria-label={labels.editCell(column.header)}
        aria-invalid={error ? true : undefined}
        title={error ?? undefined}
        className={FIELD_CLASS}
        onChange={(event) => {
          setText(event.target.value)
          if (error) setError(null)
        }}
        onKeyDown={onKeyDown}
        // Leaving the cell saves a valid edit and drops an invalid one
        onBlur={() => {
          if (settled.current) return
          void submit().then((ok) => {
            if (!ok) cancel()
          })
        }}
      />
      {error && (
        <span role="alert" className="sr-only">
          {error}
        </span>
      )}
    </>
  )
}
