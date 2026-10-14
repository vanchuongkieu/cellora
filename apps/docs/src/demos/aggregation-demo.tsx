import { DataGrid, type DataGridColumnInput } from "@cellora/react"

import { employees, formatMoney, type Employee } from "./data"

const columns: DataGridColumnInput<Employee>[] = [
  { id: "department", header: "Department", accessor: (row) => row.department, width: 200 },
  { id: "name", header: "Name", accessor: (row) => row.name, width: 170 },
  // Built-in aggregates: "sum" | "avg" | "min" | "max" | "count"
  {
    id: "salary",
    header: "Total salary",
    accessor: (row) => row.salary,
    align: "right",
    aggregate: "sum",
    cell: (row) => formatMoney(row.salary),
    aggregateCell: (value) => formatMoney(value as number),
  },
  {
    id: "avgSalary",
    header: "Average",
    accessor: (row) => row.salary,
    align: "right",
    aggregate: "avg",
    cell: (row) => formatMoney(row.salary),
    aggregateCell: (value) => formatMoney(value as number),
  },
  // Or any function over the group's values
  {
    id: "remote",
    header: "Remote",
    accessor: (row) => row.remote,
    align: "right",
    aggregate: (values) => `${values.filter(Boolean).length} / ${values.length}`,
    cell: (row) => (row.remote ? "Yes" : "No"),
  },
]

export default function AggregationDemo() {
  return <DataGrid rows={employees} columns={columns} getRowId={(row) => row.id} defaultGroupBy={["department"]} enableFooterRow pageSize={10} />
}
