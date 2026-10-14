import { useState } from "react"
import { DataGrid, type DataGridCellComponentProps, type DataGridColumnInput } from "@cellora/react"

import { employees, formatMoney, type Employee } from "./data"
import { StatusBadge } from "./demo-ui"

/** A cell as a component: hooks work inside. */
function RevealEmail({ row }: DataGridCellComponentProps<Employee>) {
  const [shown, setShown] = useState(false)
  return shown ? (
    <span>{row.email}</span>
  ) : (
    <button type="button" className="text-xs text-primary underline-offset-2 hover:underline" onClick={() => setShown(true)}>
      Show email
    </button>
  )
}

const columns: DataGridColumnInput<Employee>[] = [
  {
    id: "name",
    header: "Employee",
    accessor: (row) => row.name,
    width: 220,
    // cell: any React node; the value stays row.name for sorting and search
    cell: (row) => (
      <div className="flex items-center gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
          {row.name
            .split(" ")
            .map((part) => part[0])
            .join("")}
        </span>
        <span className="truncate">{row.name}</span>
      </div>
    ),
  },
  { id: "status", header: "Status", accessor: (row) => row.status, cell: (row) => <StatusBadge status={row.status} /> },
  {
    id: "salary",
    header: "Salary",
    accessor: (row) => row.salary,
    align: "right",
    // headerCell replaces the label only; sorting, menu and resizing stay
    headerCell: ({ sorted }) => <span>Salary {sorted === "asc" ? "(low → high)" : sorted === "desc" ? "(high → low)" : ""}</span>,
    sortable: true,
    cell: (row) => <span className={row.salary > 100_000 ? "font-semibold text-emerald-600 dark:text-emerald-400" : ""}>{formatMoney(row.salary)}</span>,
  },
  { id: "email", header: "Email", accessor: (row) => row.email, width: 240, cellComponent: RevealEmail },
]

export default function CustomCellsDemo() {
  return <DataGrid rows={employees} columns={columns} getRowId={(row) => row.id} pageSize={5} enableSorting />
}
