import { useMemo, useState } from "react"
import { DataGrid, type DataGridColumnInput } from "@cellora/react"

import { DemoButton, DemoToolbar } from "./demo-ui"

// A million objects would cost memory for nothing: here a row is just its
// index and every column derives its value from it.
const WORDS = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel"]
const hash = (row: number, column: number) => (Math.imul(row + 1, 2654435761) ^ Math.imul(column + 1, 40503)) >>> 0

const columns: DataGridColumnInput<number>[] = [
  { id: "n", header: "#", accessor: (row) => row + 1, align: "right", width: 100, sticky: "left", sortable: true },
  ...Array.from({ length: 49 }, (_, i): DataGridColumnInput<number> => {
    const c = i + 1
    return i % 2 === 0
      ? { id: `name${c}`, header: `Name ${c}`, accessor: (row) => `${WORDS[hash(row, c) % WORDS.length]} ${hash(row, c) % 1000}`, width: 140, sortable: true }
      : { id: `amount${c}`, header: `Amount ${c}`, accessor: (row) => hash(row, c) % 100_000, align: "right", width: 120, sortable: true }
  }),
]

const SIZES = [10_000, 100_000, 1_000_000]

export default function VirtualScrollDemo() {
  const [count, setCount] = useState(100_000)
  const rows = useMemo(() => Array.from({ length: count }, (_, i) => i), [count])

  return (
    <>
      <DemoToolbar>
        {SIZES.map((size) => (
          <DemoButton key={size} active={count === size} onClick={() => setCount(size)}>
            {size.toLocaleString("en-US")} rows
          </DemoButton>
        ))}
      </DemoToolbar>
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(row) => String(row)}
        // Only the rows and columns in view exist in the DOM
        virtualized
        maxHeight={420}
        enableSorting
        enableSearch
      />
    </>
  )
}
