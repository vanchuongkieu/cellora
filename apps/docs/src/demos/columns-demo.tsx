import { DataGrid, type DataGridColumnInput } from "@cellora/react"

import { employees, formatDay, formatMoney, type Employee } from "./data"

// Define columns once, outside the component (or in useMemo): the grid then
// never has to re-read your rows when the parent re-renders.
const columns: DataGridColumnInput<Employee>[] = [
  // id + header + accessor is all a column needs
  { id: "name", header: "Name", accessor: (row) => row.name },
  // width in px (fixed, never jumps with the content)
  { id: "email", header: "Email", accessor: (row) => row.email, width: 240 },
  // cell: how the value looks; accessor stays the raw value (used to sort, filter, group)
  { id: "salary", header: "Salary", accessor: (row) => row.salary, align: "right", cell: (row) => formatMoney(row.salary) },
  { id: "startDate", header: "Start date", accessor: (row) => row.startDate, cell: (row) => formatDay(row.startDate) },
  // align: "left" (default), "center" or "right"
  { id: "remote", header: "Remote", accessor: (row) => row.remote, align: "center", width: 100, cell: (row) => (row.remote ? "✓" : "") },
]

export default function ColumnsDemo() {
  return <DataGrid rows={employees} columns={columns} getRowId={(row) => row.id} pageSize={5} />
}
