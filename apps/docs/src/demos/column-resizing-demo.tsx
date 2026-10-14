import { DataGrid, type DataGridColumnInput } from "@cellora/react"

import { employees, type Employee } from "./data"

const columns: DataGridColumnInput<Employee>[] = [
  // minWidth / maxWidth bound the drag
  { id: "name", header: "Name", accessor: (row) => row.name, width: 160, minWidth: 120, maxWidth: 320 },
  { id: "email", header: "Email", accessor: (row) => row.email, width: 140 },
  { id: "department", header: "Department", accessor: (row) => row.department },
  // resizable: false keeps this one fixed
  { id: "id", header: "ID", accessor: (row) => row.id, width: 100, resizable: false },
]

export default function ColumnResizingDemo() {
  // Drag the line at a header's right edge, double-click it to fit the content,
  // or focus it with Tab and use ← / →
  return <DataGrid rows={employees} columns={columns} getRowId={(row) => row.id} pageSize={5} resizeHandle="hover" autoFitOnDoubleClick="both" />
}
