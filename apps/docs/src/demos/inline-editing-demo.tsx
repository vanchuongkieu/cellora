import { useState } from "react"
import { DataGrid, type DataGridCellEdit, type DataGridColumnInput } from "@cellora/react"

import { DEPARTMENTS, makeEmployees, formatDay, formatMoney, type Employee } from "./data"
import { DemoOutput } from "./demo-ui"

const columns: DataGridColumnInput<Employee>[] = [
  // editor "text" is the default; validate returns a message to reject
  { id: "name", header: "Name", accessor: (row) => row.name, editable: true, validate: (value) => (String(value ?? "").trim() ? null : "Name is required") },
  // "select" needs editorOptions
  { id: "department", header: "Department", accessor: (row) => row.department, editable: true, editor: "select", editorOptions: DEPARTMENTS.map((d) => ({ value: d, label: d })) },
  // "number" parses the text into a number
  { id: "salary", header: "Salary", accessor: (row) => row.salary, align: "right", editable: true, editor: "number", cell: (row) => formatMoney(row.salary) },
  // "date" uses the native date picker
  { id: "startDate", header: "Start date", accessor: (row) => row.startDate, editable: true, editor: "date", cell: (row) => formatDay(row.startDate) },
  // "checkbox" saves on every click, no edit mode
  { id: "remote", header: "Remote", accessor: (row) => row.remote, align: "center", width: 100, editable: true, editor: "checkbox" },
  // editable can depend on the row
  { id: "email", header: "Email (not for inactive)", accessor: (row) => row.email, width: 240, editable: (row) => row.status !== "Inactive" },
]

export default function InlineEditingDemo() {
  // The grid never owns your data: apply each accepted edit yourself
  const [rows, setRows] = useState(() => makeEmployees(20))
  const [last, setLast] = useState("double-click a cell")

  const onCellEdit = ({ rowId, columnId, value, previousValue }: DataGridCellEdit<Employee>) => {
    setRows((current) => current.map((row) => (row.id === rowId ? { ...row, [columnId]: value } : row)))
    setLast(`${rowId}.${columnId}: ${String(previousValue)} → ${String(value)}`)
    // Return false (or throw) to reject the change and keep the editor open
  }

  return (
    <>
      <DataGrid rows={rows} columns={columns} getRowId={(row) => row.id} pageSize={5} enableEditing onCellEdit={onCellEdit} />
      <DemoOutput label="onCellEdit">{last}</DemoOutput>
    </>
  )
}
