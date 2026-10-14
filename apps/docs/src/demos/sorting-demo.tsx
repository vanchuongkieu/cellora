import { DataGrid, type DataGridColumnInput } from "@cellora/react"

import { employees, formatDay, formatMoney, type Employee } from "./data"

const columns: DataGridColumnInput<Employee>[] = [
  // sortable: true opts a column in; the grid-level switch must be on too
  { id: "name", header: "Name", accessor: (row) => row.name, sortable: true },
  { id: "department", header: "Department", accessor: (row) => row.department, sortable: true },
  // Numbers and dates sort by value, not as text
  { id: "salary", header: "Salary", accessor: (row) => row.salary, align: "right", sortable: true, cell: (row) => formatMoney(row.salary) },
  { id: "startDate", header: "Start date", accessor: (row) => row.startDate, sortable: true, cell: (row) => formatDay(row.startDate) },
  // Not sortable: clicking the header does nothing
  { id: "email", header: "Email", accessor: (row) => row.email, width: 240 },
]

export default function SortingDemo() {
  // Click a header: ascending → descending → unsorted
  return <DataGrid rows={employees} columns={columns} getRowId={(row) => row.id} pageSize={5} enableSorting />
}
