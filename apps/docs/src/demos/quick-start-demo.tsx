import { DataGrid } from "@cellora/react"

import { employeeColumns, employees } from "./data"

export default function QuickStartDemo() {
  return <DataGrid rows={employees} columns={employeeColumns} getRowId={(row) => row.id} />
}
