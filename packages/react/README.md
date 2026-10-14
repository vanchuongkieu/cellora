# @cellora/react

**Cellora** — the fast, fully customizable React data grid for shadcn/ui. Sorting, accent-insensitive search, filters, grouping, totals, inline editing, selection, pinned columns, server-side data and virtual scrolling for a million rows. Works with SSR, SSG and client rendering.

**Documentation (EN / VI): <https://cellora.vanchuongkieu.com>** · for AI assistants: [llms.txt](https://cellora.vanchuongkieu.com/llms.txt)

## Install

```sh
pnpm add @cellora/react
```

Requires React 18 or 19, Tailwind CSS v4 and the shadcn/ui theme variables (`npx shadcn@latest init`). Import the grid's styles after Tailwind:

```css
@import "tailwindcss";
@import "@cellora/react/styles.css";
```

## Use

```tsx
import { DataGrid } from "@cellora/react"

const columns = [
  { id: "name", header: "Name", accessor: (row: Person) => row.name, sortable: true },
  { id: "age", header: "Age", accessor: (row: Person) => row.age, align: "right" as const, sortable: true },
]

export function People({ rows }: { rows: Person[] }) {
  return <DataGrid rows={rows} columns={columns} getRowId={(row) => row.id} enableSorting />
}
```

Turn features on with props: `enableSearch`, `enableRowSelection`, `enableEditing`, `virtualized`, `enableGroupPanel`, … Let an API do the work with `manualSorting` / `manualFiltering` / `manualPagination` + `onStateChange`. Change the rules per column with `sortValue`, `compare`, `searchValue`, `filterMatch`.

See the [quick start](https://cellora.vanchuongkieu.com/getting-started/quick-start/) and the [API reference](https://cellora.vanchuongkieu.com/api/data-grid/).
