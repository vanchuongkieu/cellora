import { DataGrid, type DataGridColumnInput } from "@cellora/react"

import { employees, type Employee } from "./data"

const columns: DataGridColumnInput<Employee>[] = [
  { id: "name", header: "Name", accessor: (row) => row.name },
  { id: "department", header: "Department", accessor: (row) => row.department },
  { id: "role", header: "Role", accessor: (row) => row.role },
  { id: "status", header: "Status", accessor: (row) => row.status },
  // filterable: false hides "Filter" in this column's menu
  { id: "id", header: "ID", accessor: (row) => row.id, filterable: false, width: 110 },
]

export default function ColumnFiltersDemo() {
  // Open ⋮ on a header → Filter, type "eng". A filter icon marks filtered columns.
  return <DataGrid rows={employees} columns={columns} getRowId={(row) => row.id} pageSize={5} columnMenuItems={{ sort: false, pin: false, group: false }} />
}
