import { useState } from "react"
import { DataGrid } from "@cellora/react"

import { employeeColumns, employees } from "./data"
import { DemoOutput } from "./demo-ui"

export default function RowClickDemo() {
  const [last, setLast] = useState("click a row")

  return (
    <>
      <DataGrid
        rows={employees}
        columns={employeeColumns}
        getRowId={(row) => row.id}
        pageSize={5}
        // Rows and cells get the pointer cursor once a handler is set
        onCellClick={({ column, value }) => setLast(`cell ${column.id} = ${String(value)}`)}
        onRowClick={({ row, rowId }) => setLast((cell) => `${cell} · row ${rowId} (${row.name})`)}
      />
      <DemoOutput label="onCellClick + onRowClick">{last}</DemoOutput>
    </>
  )
}
