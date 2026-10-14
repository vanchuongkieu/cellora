import { DataGrid, type DataGridApi, type DataGridSlots } from "@cellora/react"

import { employeeColumns, employees, type Employee } from "./data"

// 1. slots: plain functions, one per part of the grid
const slots: DataGridSlots<Employee> = {
  sortIcon: (direction) => <span className="text-xs text-muted-foreground">{direction === "asc" ? "▲" : direction === "desc" ? "▼" : "↕"}</span>,
  range: ({ from, to, total }) => (
    <span>
      Showing <b>{from}</b>–<b>{to}</b> of <b>{total}</b> employees
    </span>
  ),
}

// 2. components: the same slots as React components (hooks allowed)
function Toolbar({ grid }: { grid: DataGridApi<Employee> }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <input
        className="h-8 w-56 rounded-md border px-2 text-sm"
        placeholder="Filter by name..."
        value={grid.state.columnFilters.name ?? ""}
        onChange={(event) => grid.setColumnFilter("name", event.target.value)}
      />
      <span className="text-xs text-muted-foreground">{grid.result.total} matching</span>
    </div>
  )
}

export default function SlotsDemo() {
  return (
    <DataGrid rows={employees} columns={employeeColumns} getRowId={(row) => row.id} pageSize={5} enableSorting slots={slots} components={{ toolbar: Toolbar }}>
      {/* 3. JSX children: win over components and slots */}
      <DataGrid.Empty>No employee matches that name.</DataGrid.Empty>
    </DataGrid>
  )
}
