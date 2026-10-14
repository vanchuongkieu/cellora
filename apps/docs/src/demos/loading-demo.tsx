import { useState } from "react"
import { DataGrid, type DataGridLoadingVariant } from "@cellora/react"

import { employeeColumns, employees } from "./data"
import { DemoButton, DemoToolbar } from "./demo-ui"

const VARIANTS: DataGridLoadingVariant[] = ["auto", "skeleton", "overlay"]

export default function LoadingDemo() {
  const [loading, setLoading] = useState(true)
  const [variant, setVariant] = useState<DataGridLoadingVariant>("skeleton")
  const [empty, setEmpty] = useState(false)

  return (
    <>
      <DemoToolbar>
        <DemoButton active={loading} onClick={() => setLoading((on) => !on)}>
          loading
        </DemoButton>
        {VARIANTS.map((name) => (
          <DemoButton key={name} active={variant === name} onClick={() => setVariant(name)}>
            {name}
          </DemoButton>
        ))}
        <DemoButton active={empty} onClick={() => setEmpty((on) => !on)}>
          no rows
        </DemoButton>
      </DemoToolbar>
      <DataGrid
        rows={empty ? [] : employees}
        columns={employeeColumns}
        getRowId={(row) => row.id}
        pageSize={5}
        loading={loading}
        loadingVariant={variant}
        loadingRows={5}
        emptyMessage="No employees yet."
      />
    </>
  )
}
