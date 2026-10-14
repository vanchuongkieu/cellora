import { useEffect, useState } from "react"
import { DataGrid, type DataGridState } from "@cellora/react"

import { employeeColumns, makeEmployees, type Employee } from "./data"
import { DemoOutput } from "./demo-ui"

// ---- A pretend API: it sorts, filters and pages on "the server" ----------
const DATABASE = makeEmployees(250)

async function fetchEmployees(state: DataGridState): Promise<{ rows: Employee[]; total: number }> {
  await new Promise((done) => setTimeout(done, 400)) // network latency
  let rows = DATABASE
  if (state.filter) rows = rows.filter((row) => JSON.stringify(row).toLowerCase().includes(state.filter.toLowerCase()))
  for (const [columnId, text] of Object.entries(state.columnFilters))
    rows = rows.filter((row) =>
      String(row[columnId as keyof Employee])
        .toLowerCase()
        .includes(text.toLowerCase())
    )
  if (state.sort) {
    const { columnId, direction } = state.sort
    const key = columnId as keyof Employee
    rows = [...rows].sort((a, b) => (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0) * (direction === "asc" ? 1 : -1))
  }
  const start = state.pageIndex * state.pageSize
  return { rows: rows.slice(start, start + state.pageSize), total: rows.length }
}

// ---- The grid: keeps the state, the API does the work --------------------
export default function ServerSideDemo() {
  const [state, setState] = useState<DataGridState>({ sort: null, filter: "", columnFilters: {}, pageIndex: 0, pageSize: 5 })
  const [page, setPage] = useState<{ rows: Employee[]; total: number }>({ rows: [], total: 0 })
  const [loading, setLoading] = useState(true)
  const [calls, setCalls] = useState(0)

  // Fetch whenever the grid reports a change (sort, search, filter, page)
  useEffect(() => {
    let current = true
    setLoading(true)
    fetchEmployees(state).then((result) => {
      if (!current) return // a newer request is already running
      setPage(result)
      setLoading(false)
      setCalls((count) => count + 1)
    })
    return () => {
      current = false
    }
  }, [state])

  return (
    <>
      <DataGrid
        rows={page.rows}
        columns={employeeColumns.map((column) => ({ ...column, sortable: true }))}
        getRowId={(row) => row.id}
        // The rows are already sorted, filtered and paged: show them as they are
        manualSorting
        manualFiltering
        manualPagination
        rowCount={page.total}
        // Every change (sort, search, column filter, page, page size) lands here
        onStateChange={setState}
        pageSize={state.pageSize}
        loading={loading}
        loadingVariant="overlay"
        enableSorting
        enableSearch
      />
      <DemoOutput label="API calls">{`${calls} · last query: ${JSON.stringify(state)}`}</DemoOutput>
    </>
  )
}
