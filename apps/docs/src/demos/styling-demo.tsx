import { DataGrid, type DataGridClassNames, type DataGridStyles } from "@cellora/react"

import { employeeColumns, employees } from "./data"

// Classes are merged after the defaults (tailwind-merge), so yours win.
const classNames: DataGridClassNames = {
  scroll: "rounded-xl border-2 border-primary/30",
  headerCell: "bg-primary/5 text-primary uppercase text-xs tracking-wide",
  row: "odd:bg-muted/40",
  footer: "text-primary",
}

// Inline styles for what a class cannot say.
const styles: DataGridStyles = {
  cell: { fontVariantNumeric: "tabular-nums" },
}

export default function StylingDemo() {
  return <DataGrid rows={employees} columns={employeeColumns} getRowId={(row) => row.id} pageSize={5} bordered classNames={classNames} styles={styles} />
}
