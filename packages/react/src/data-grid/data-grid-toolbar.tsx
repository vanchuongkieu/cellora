import { SearchIcon } from "lucide-react"
import { cn } from "cn"

import { Input } from "@/components/ui/input"

import { useDataGridParts } from "./styling"
import type { DataGridLabels, DataGridSlots } from "./types"
import type { DataGridApi } from "./use-data-grid"

interface DataGridToolbarProps<TRow> {
  grid: DataGridApi<TRow>
  searchPlaceholder: string
  labels: DataGridLabels
  slots?: DataGridSlots<TRow>
}

export function DataGridToolbar<TRow>({ grid, searchPlaceholder, labels, slots }: DataGridToolbarProps<TRow>) {
  const { classNames, styles } = useDataGridParts()
  if (slots?.toolbar) return <>{slots.toolbar(grid)}</>

  return (
    <div data-slot="data-grid-toolbar" className={cn("flex items-center gap-2", classNames.toolbar)} style={styles.toolbar}>
      {slots?.search ? (
        slots.search(grid)
      ) : (
        <div className="relative w-full max-w-xs">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={grid.state.filter}
            onChange={(event) => grid.setFilter(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={labels.searchRows}
            className={cn("pl-8", classNames.search)}
            style={styles.search}
          />
        </div>
      )}
    </div>
  )
}
