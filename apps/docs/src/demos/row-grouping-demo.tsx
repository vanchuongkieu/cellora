import { useState } from "react"
import { DataGrid } from "@cellora/react"

import { employeeColumns, employees } from "./data"
import { DemoOutput } from "./demo-ui"

export default function RowGroupingDemo() {
  // Controlled: the grid reports every change, you decide what to keep
  const [groupBy, setGroupBy] = useState<readonly string[]>(["department"])

  return (
    <>
      <DataGrid
        rows={employees}
        columns={employeeColumns}
        getRowId={(row) => row.id}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        // Drag a header onto this bar to add a level; drag chips to reorder
        enableGroupPanel
        groupDefaultExpanded={false}
        pageSize={10}
      />
      <DemoOutput label="groupBy">{JSON.stringify(groupBy)}</DemoOutput>
    </>
  )
}
