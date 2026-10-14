import { DataGrid, type DataGridColumnInput } from "@cellora/react"

import { employees, formatDay, formatMoney, type Employee } from "./data"

const columns: DataGridColumnInput<Employee>[] = [
  { id: "name", header: "Name", accessor: (row) => row.name, width: 170 },
  // A string puts the column under one group label
  { id: "department", header: "Department", accessor: (row) => row.department, headerGroup: "Work" },
  { id: "role", header: "Role", accessor: (row) => row.role, headerGroup: "Work" },
  // An array nests groups, outermost first. Neighbours with the same path share one cell.
  { id: "salary", header: "Salary", accessor: (row) => row.salary, align: "right", headerGroup: ["Contract", "Pay"], cell: (row) => formatMoney(row.salary) },
  { id: "remote", header: "Remote", accessor: (row) => (row.remote ? "Yes" : "No"), headerGroup: ["Contract", "Terms"] },
  { id: "startDate", header: "Start date", accessor: (row) => row.startDate, headerGroup: ["Contract", "Terms"], cell: (row) => formatDay(row.startDate) },
]

export default function ColumnGroupsDemo() {
  return <DataGrid rows={employees} columns={columns} getRowId={(row) => row.id} pageSize={5} bordered />
}
