import { DataGrid } from "@cellora/react"

import { employeeColumns, employees } from "./data"

export default function PaginationDemo() {
  return (
    <DataGrid
      rows={employees}
      columns={employeeColumns}
      getRowId={(row) => row.id}
      // Rows on the first render, and the choices in "Rows per page"
      pageSize={5}
      pageSizeOptions={[5, 10, 25]}
    />
  )
}
