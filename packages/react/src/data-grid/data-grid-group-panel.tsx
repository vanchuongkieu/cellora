import { useState, type DragEvent } from "react"
import { cn } from "cn"
import { XIcon } from "lucide-react"

import { useDataGridParts } from "./styling"
import type { DataGridLabels, DataGridSlots } from "./types"
import type { DataGridApi } from "./use-data-grid"

/** Drag payload types: a header being dragged in, a chip being reordered. */
export const COLUMN_DRAG_TYPE = "application/x-data-grid-column"
const CHIP_DRAG_TYPE = "application/x-data-grid-group-chip"

const hasType = (event: DragEvent, type: string) => event.dataTransfer.types.includes(type)

interface DataGridGroupPanelProps<TRow> {
  grid: DataGridApi<TRow>
  labels: DataGridLabels
  slots?: DataGridSlots<TRow>
  className?: string
}

/**
 * "Group by" bar above the grid: drop a column header on it to group rows by
 * that column, drag chips to reorder the levels, click x to ungroup.
 */
export function DataGridGroupPanel<TRow>({ grid, labels, slots, className }: DataGridGroupPanelProps<TRow>) {
  const [over, setOver] = useState(false)
  const { classNames, styles } = useDataGridParts()
  if (slots?.groupPanel) return <>{slots.groupPanel(grid)}</>

  const setGroupBy = grid.setGroupBy
  const add = (id: string) => {
    const column = grid.columns.find((item) => item.id === id)
    if (!column || column.groupable === false || grid.groupBy.includes(id)) return
    setGroupBy([...grid.groupBy, id])
  }
  const remove = (id: string) => setGroupBy(grid.groupBy.filter((x) => x !== id))
  /** Put `id` right before `beforeId` (or last when null). */
  const move = (id: string, beforeId: string | null) => {
    const rest = grid.groupBy.filter((x) => x !== id)
    const at = beforeId === null ? rest.length : rest.indexOf(beforeId)
    if (at < 0) return
    setGroupBy([...rest.slice(0, at), id, ...rest.slice(at)])
  }

  return (
    <div
      data-slot="data-grid-group-panel"
      data-over={over || undefined}
      className={cn(
        "flex min-h-10 flex-wrap items-center gap-2 rounded-md border border-dashed px-3 py-1.5 text-sm text-muted-foreground transition-colors data-over:border-primary data-over:bg-primary/5",
        className,
        classNames.groupPanel
      )}
      style={styles.groupPanel}
      onDragOver={(event) => {
        if (!hasType(event, COLUMN_DRAG_TYPE) && !hasType(event, CHIP_DRAG_TYPE)) return
        event.preventDefault() // allow dropping here
        setOver(true)
      }}
      onDragLeave={(event) => {
        // Leaving for a child of the panel is not leaving the panel
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(false)
      }}
      onDrop={(event) => {
        setOver(false)
        const columnId = event.dataTransfer.getData(COLUMN_DRAG_TYPE)
        if (columnId) {
          event.preventDefault()
          add(columnId)
          return
        }
        // A chip dropped on empty space of the bar moves to the end
        const chipId = event.dataTransfer.getData(CHIP_DRAG_TYPE)
        if (chipId) {
          event.preventDefault()
          move(chipId, null)
        }
      }}
    >
      {grid.groupBy.length === 0 ? (
        <span>{labels.groupPanelHint}</span>
      ) : (
        grid.groupBy.map((id) => {
          const column = grid.columns.find((item) => item.id === id)
          if (!column) return null
          const removeThis = () => remove(id)
          return (
            <span
              key={id}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData(CHIP_DRAG_TYPE, id)
                event.dataTransfer.effectAllowed = "move"
              }}
              onDragOver={(event) => {
                if (!hasType(event, CHIP_DRAG_TYPE)) return
                event.preventDefault()
              }}
              onDrop={(event) => {
                const chipId = event.dataTransfer.getData(CHIP_DRAG_TYPE)
                if (!chipId) return
                event.preventDefault()
                event.stopPropagation()
                setOver(false)
                if (chipId !== id) move(chipId, id)
              }}
              className={cn("inline-flex cursor-grab items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-foreground", classNames.groupChip)}
              style={styles.groupChip}
            >
              {slots?.groupChip ? (
                slots.groupChip({ column, remove: removeThis })
              ) : (
                <>
                  {column.header}
                  <button
                    type="button"
                    aria-label={labels.removeGroup(column.header)}
                    className="inline-flex size-4 items-center justify-center rounded-full hover:bg-muted"
                    onClick={removeThis}
                  >
                    <XIcon className="size-3" />
                  </button>
                </>
              )}
            </span>
          )
        })
      )}
    </div>
  )
}
