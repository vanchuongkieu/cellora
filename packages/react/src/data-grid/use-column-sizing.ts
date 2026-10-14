import { useState, type PointerEvent as ReactPointerEvent } from "react"
import { getColumnWidth, setColumnWidth, type DataGridColumn, type DataGridColumnSizes } from "@cellora/core"

type SizedColumn = Pick<DataGridColumn, "id" | "width" | "minWidth" | "maxWidth">

/** Fixed column widths + drag/keyboard resizing. Widths never depend on content. */
export function useColumnSizing() {
  const [sizes, setSizes] = useState<DataGridColumnSizes>({})

  const getWidth = (column: SizedColumn) => getColumnWidth(column, sizes)

  const resizeTo = (column: SizedColumn, width: number) => setSizes((prev) => setColumnWidth(prev, column, width))

  const startResize = (event: ReactPointerEvent<HTMLElement>, column: SizedColumn) => {
    event.preventDefault()
    const handle = event.currentTarget
    handle.setPointerCapture(event.pointerId)
    const startX = event.clientX
    const startWidth = getWidth(column)

    const onMove = (move: PointerEvent) => resizeTo(column, startWidth + move.clientX - startX)
    const onEnd = () => {
      handle.removeEventListener("pointermove", onMove)
      handle.removeEventListener("pointerup", onEnd)
      handle.removeEventListener("pointercancel", onEnd)
      handle.removeEventListener("lostpointercapture", onEnd)
    }
    // Pointer capture keeps these events coming even outside the handle
    handle.addEventListener("pointermove", onMove)
    handle.addEventListener("pointerup", onEnd)
    handle.addEventListener("pointercancel", onEnd)
    handle.addEventListener("lostpointercapture", onEnd)
  }

  return { sizes, getWidth, resizeTo, startResize }
}
