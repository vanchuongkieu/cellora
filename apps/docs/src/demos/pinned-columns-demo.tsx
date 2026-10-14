import { DataGrid, type DataGridColumnInput } from "@cellora/react"

import { DEPARTMENTS, employees, formatMoney, ROLES, type Employee } from "./data"

const columns: DataGridColumnInput<Employee>[] = [
  // sticky: "left" keeps the column in view while scrolling sideways
  { id: "name", header: "Name", accessor: (row) => row.name, width: 170, sticky: "left" },
  { id: "email", header: "Email", accessor: (row) => row.email, width: 260 },
  // Many columns so there is something to scroll
  ...DEPARTMENTS.map((department, i) => ({
    id: `budget-${i}`,
    header: `${department} budget`,
    accessor: (row: Employee) => (row.salary * (i + 2)) % 97_000,
    align: "right" as const,
    width: 170,
    cell: (row: Employee) => formatMoney((row.salary * (i + 2)) % 97_000),
  })),
  ...ROLES.map((role, i) => ({ id: `level-${i}`, header: `${role} level`, accessor: (row: Employee) => (i * 7 + row.name.length) % 10, align: "right" as const, width: 130 })),
  // sticky: "right" pins to the other side
  { id: "salary", header: "Salary", accessor: (row) => row.salary, align: "right", width: 130, sticky: "right", cell: (row) => formatMoney(row.salary) },
]

export default function PinnedColumnsDemo() {
  // Scroll sideways: a soft shadow appears only while content runs under a pinned column
  return <DataGrid rows={employees} columns={columns} getRowId={(row) => row.id} pageSize={5} stickyDivider />
}
