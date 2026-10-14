import { useState } from "react"
import { DataGrid, type DataGridColumnInput } from "@cellora/react"

import { makeEmployees, type Employee } from "./data"
import { DemoOutput } from "./demo-ui"

export default function DisplayColumnsDemo() {
  const [rows, setRows] = useState(() => makeEmployees(12))
  const [last, setLast] = useState("click an action")

  const columns: DataGridColumnInput<Employee>[] = [
    { id: "name", header: "Name", accessor: (row) => row.name, width: 180, sortable: true },
    { id: "department", header: "Department", accessor: (row) => row.department, sortable: true },
    {
      // No accessor = a display column: never sorted, filtered, grouped, totalled or edited
      id: "actions",
      header: "Actions",
      width: 170,
      sticky: "right",
      cell: (row) => (
        <div className="flex gap-1.5">
          <button type="button" className="rounded-md border px-2 py-0.5 text-xs hover:bg-muted" onClick={() => setLast(`edit ${row.name}`)}>
            Edit
          </button>
          <button
            type="button"
            className="rounded-md border border-destructive/40 px-2 py-0.5 text-xs text-destructive hover:bg-destructive/10"
            onClick={() => {
              setRows((current) => current.filter((item) => item.id !== row.id))
              setLast(`deleted ${row.name}`)
            }}
          >
            Delete
          </button>
        </div>
      ),
    },
  ]

  return (
    <>
      <DataGrid rows={rows} columns={columns} getRowId={(row) => row.id} pageSize={5} enableSorting enableSearch />
      <DemoOutput label="action">{last}</DemoOutput>
    </>
  )
}
