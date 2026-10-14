import { DataGrid } from "@cellora/react"

import { employeeColumns, employees } from "./data"

export default function HeightDemo() {
  return (
    <DataGrid
      rows={employees}
      columns={employeeColumns}
      getRowId={(row) => row.id}
      // One long list instead of pages...
      enablePagination={false}
      // ...that scrolls inside 260px, with the header kept on top
      maxHeight={260}
      stickyHeader
    />
  )
}
