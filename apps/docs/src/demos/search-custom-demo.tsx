import { DataGrid } from "@cellora/react"

import { employeeColumns, employees, type Employee } from "./data"

/**
 * Your own search: every word must appear somewhere in the row ("design lead"
 * finds designers who are leads), and "status:active" filters on a field.
 */
function searchFilter(row: Employee, term: string) {
  const haystack = `${row.name} ${row.email} ${row.department} ${row.role} ${row.status}`.toLowerCase()
  return term
    .toLowerCase()
    .split(/\s+/)
    .every((word) => {
      const [field, value] = word.split(":")
      if (value !== undefined && field in row) return String(row[field as keyof Employee]).toLowerCase() === value
      return haystack.includes(word)
    })
}

export default function SearchCustomDemo() {
  // Try "design lead" or "status:active sales"
  return (
    <DataGrid rows={employees} columns={employeeColumns} getRowId={(row) => row.id} pageSize={5} enableSearch searchFilter={searchFilter} searchPlaceholder="Try: design lead" />
  )
}
