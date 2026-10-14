import { DataGrid, type DataGridColumnInput } from "@cellora/react"

import { employees, type Employee } from "./data"

const columns: DataGridColumnInput<Employee>[] = [
  { id: "name", header: "Name", accessor: (row) => row.name, sortable: true, width: 180 },
  { id: "department", header: "Department", accessor: (row) => row.department, sortable: true },
  { id: "role", header: "Role", accessor: (row) => row.role, sortable: true },
  // hideable: false keeps it out of "Hide column" and "Manage columns"
  { id: "email", header: "Email", accessor: (row) => row.email, width: 240, hideable: false },
  // menu: false removes the ⋮ button from this header only
  { id: "id", header: "ID", accessor: (row) => row.id, width: 100, menu: false },
]

export default function ColumnMenuDemo() {
  return (
    <DataGrid
      rows={employees}
      columns={columns}
      getRowId={(row) => row.id}
      pageSize={5}
      enableSorting
      // Turn single menu groups off; all are on by default
      columnMenuItems={{ group: false }}
      columnMenuWidth={240}
      columnMenuAlign="start"
    />
  )
}
