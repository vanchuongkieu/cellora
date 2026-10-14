import { DataGrid, type DataGridColumnInput } from "@cellora/react"

import { employees, formatDay, formatMoney, type Employee } from "./data"

const columns: DataGridColumnInput<Employee>[] = [
  { id: "name", header: "Name", accessor: (row) => row.name },
  // filterValue: filter on the formatted date ("2024", "mar") instead of the Date object
  { id: "startDate", header: "Start date", accessor: (row) => row.startDate, cell: (row) => formatDay(row.startDate), filterValue: (row) => formatDay(row.startDate) },
  // filterMatch: your own rule. ">60000" / "<50000" compare the number
  {
    id: "salary",
    header: "Salary (try >60000)",
    accessor: (row) => row.salary,
    align: "right",
    width: 180,
    cell: (row) => formatMoney(row.salary),
    filterMatch: (row, text) => {
      const amount = Number(text.slice(1))
      if (text.startsWith(">")) return row.salary > amount
      if (text.startsWith("<")) return row.salary < amount
      return String(row.salary).includes(text)
    },
  },
  // filterMatch for an exact match: "lead" must not match "Lead" inside "Team Lead"
  { id: "role", header: "Role (exact)", accessor: (row) => row.role, filterMatch: (row, text) => row.role.toLowerCase() === text.toLowerCase() },
]

export default function ColumnFiltersCustomDemo() {
  // Open ⋮ → Filter on "Salary" and type ">60000"
  return <DataGrid rows={employees} columns={columns} getRowId={(row) => row.id} pageSize={5} columnMenuItems={{ sort: false, pin: false, group: false }} />
}
