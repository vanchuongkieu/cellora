import { DataGrid, type DataGridColumnInput } from "@cellora/react"

import { employees, type Employee } from "./data"

// "Junior" < "Mid" < "Senior" < "Lead" < "Manager": not alphabetical
const ROLE_RANK: Record<string, number> = { Junior: 0, Mid: 1, Senior: 2, Lead: 3, Manager: 4 }

const columns: DataGridColumnInput<Employee>[] = [
  // sortValue: sort by a value other than the accessor's (here the last name)
  { id: "name", header: "Name (by last name)", accessor: (row) => row.name, sortable: true, sortValue: (row) => row.name.split(" ").at(-1) },
  // sortValue with a rank: seniority order instead of alphabetical
  { id: "role", header: "Role (by seniority)", accessor: (row) => row.role, sortable: true, sortValue: (row) => ROLE_RANK[row.role] },
  // compare: your own comparison of two rows; the grid flips it for descending
  {
    id: "status",
    header: "Status (Active first, then name)",
    accessor: (row) => row.status,
    width: 240,
    sortable: true,
    compare: (a, b) => Number(b.status === "Active") - Number(a.status === "Active") || a.name.localeCompare(b.name),
  },
]

export default function SortingCustomDemo() {
  return <DataGrid rows={employees} columns={columns} getRowId={(row) => row.id} pageSize={5} enableSorting />
}
