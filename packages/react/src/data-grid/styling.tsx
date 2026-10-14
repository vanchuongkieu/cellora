import { createContext, useContext, useMemo, type ReactNode } from "react"

import { useStable } from "./stable"
import type { DataGridClassNames, DataGridStyles } from "./types"

interface DataGridParts {
  classNames: DataGridClassNames
  styles: DataGridStyles
  /** Lines between columns too */
  bordered: boolean
  /** Rows / cells react to clicks: they get the pointer cursor */
  rowClickable: boolean
  cellClickable: boolean
}

const NO_PARTS: DataGridParts = { classNames: {}, styles: {}, bordered: false, rowClickable: false, cellClickable: false }

const PartsContext = createContext<DataGridParts>(NO_PARTS)

/**
 * Hands `classNames` / `styles` to every part of the grid without passing
 * them through each layer. They are usually inline literals, so the value only
 * changes when the content does (rows would otherwise re-render every time).
 */
export function DataGridStyleProvider({
  classNames,
  styles,
  bordered = false,
  rowClickable = false,
  cellClickable = false,
  children,
}: {
  classNames?: DataGridClassNames
  styles?: DataGridStyles
  bordered?: boolean
  rowClickable?: boolean
  cellClickable?: boolean
  children: ReactNode
}) {
  const parts = useStable<DataGridParts>(
    useMemo(() => ({ classNames: classNames ?? {}, styles: styles ?? {}, bordered, rowClickable, cellClickable }), [classNames, styles, bordered, rowClickable, cellClickable]),
    JSON.stringify([classNames, styles, bordered, rowClickable, cellClickable])
  )
  return <PartsContext value={parts}>{children}</PartsContext>
}

/** The `classNames` and `styles` the grid was given, plus its look switches (bordered, clickable). */
export const useDataGridParts = () => useContext(PartsContext)
