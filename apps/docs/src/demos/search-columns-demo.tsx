import { DataGrid, type DataGridColumnInput } from "@cellora/react"

import { employees, formatDay, formatMoney, type Employee } from "./data"

const columns: DataGridColumnInput<Employee>[] = [
  { id: "name", header: "Name", accessor: (row) => row.name },
  { id: "department", header: "Department", accessor: (row) => row.department },
  // searchValue: the box matches the formatted date ("mar 2024"), not the Date object
  { id: "startDate", header: "Start date", accessor: (row) => row.startDate, cell: (row) => formatDay(row.startDate), searchValue: (row) => formatDay(row.startDate) },
  // searchValue can also search what is shown ("$52,000") instead of the raw number
  { id: "salary", header: "Salary", accessor: (row) => row.salary, align: "right", cell: (row) => formatMoney(row.salary), searchValue: (row) => formatMoney(row.salary) },
  // searchable: false keeps internal ids out of the search
  { id: "id", header: "ID", accessor: (row) => row.id, width: 100, searchable: false },
]

export default function SearchColumnsDemo() {
  // Try "mar 2024", "$52" or an id like "E0003" (not found: ids are not searched)
  return <DataGrid rows={employees} columns={columns} getRowId={(row) => row.id} pageSize={5} enableSearch searchPlaceholder="Try: mar 2024, $52, E0003" />
}
