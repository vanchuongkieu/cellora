import { useState } from "react"
import { DataGrid, type DataGridSelectionChange } from "@cellora/react"

import { employeeColumns, employees, type Employee } from "./data"
import { DemoOutput } from "./demo-ui"

export default function RowSelectionDemo() {
  const [selection, setSelection] = useState<DataGridSelectionChange<Employee> | null>(null)

  return (
    <>
      <DataGrid
        rows={employees}
        columns={employeeColumns}
        // Selection is stored by this id, so it survives paging, sorting and filtering
        getRowId={(row) => row.id}
        pageSize={5}
        enableRowSelection
        // The header checkbox selects every matching row, not just this page
        selectAllScope="all"
        // Inactive employees cannot be checked
        isRowSelectable={(row) => row.status !== "Inactive"}
        onSelectionChange={setSelection}
      />
      <DemoOutput label="onSelectionChange">
        {selection
          ? `${selection.count} selected: ${selection.selectedRows
              .slice(0, 3)
              .map((row) => row.name)
              .join(", ")}${selection.count > 3 ? "…" : ""}`
          : "check a row"}
      </DemoOutput>
    </>
  )
}
