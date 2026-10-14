import { DataGrid } from "@cellora/react"

import { employees, formatMoney, type Employee } from "./data"
import { StatusBadge } from "./demo-ui"

export default function JsxColumnsDemo() {
  return (
    <DataGrid rows={employees} getRowId={(row) => row.id} pageSize={5}>
      {/* field = the property to read; it also becomes the id */}
      <DataGrid.Column<Employee> field="name" header="Name" width={180} />
      <DataGrid.Column<Employee> field="department" header="Department" />
      {/* A function child is the cell renderer */}
      <DataGrid.Column<Employee> field="status" header="Status">
        {(row) => <StatusBadge status={row.status} />}
      </DataGrid.Column>
      {/* Or name the parts explicitly */}
      <DataGrid.Column<Employee> field="salary" header="Salary" align="right">
        <DataGrid.Column.Header>{() => "Salary (USD)"}</DataGrid.Column.Header>
        <DataGrid.Column.Cell>{(row: Employee) => formatMoney(row.salary)}</DataGrid.Column.Cell>
      </DataGrid.Column>
    </DataGrid>
  )
}
