import { DataGrid } from "@cellora/react"

import { employeeColumns, employees } from "./data"

export default function SearchDemo() {
  // Type "design", "nguyen" (finds "Nguyễn": accents are ignored) or "52000":
  // every data column is searched, case-insensitive
  return <DataGrid rows={employees} columns={employeeColumns} getRowId={(row) => row.id} pageSize={5} enableSearch searchPlaceholder="Search employees..." />
}
