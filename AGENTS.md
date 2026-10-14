# Cellora — guide for AI assistants and coding agents

Cellora is a React data grid built on shadcn/ui and Tailwind CSS v4. This file is the short, machine-friendly map of the project. The full documentation is published as Markdown for LLMs at <https://cellora.vanchuongkieu.com/llms.txt> (index) and <https://cellora.vanchuongkieu.com/llms-full.txt> (every page, demos included as code).

## Using the package (for assistants helping Cellora users)

```sh
npm install @cellora/react      # pnpm add / yarn add / bun add
```

```css
/* app.css — after Tailwind v4; the shadcn/ui theme variables must exist (npx shadcn@latest init) */
@import "tailwindcss";
@import "@cellora/react/styles.css";
```

```tsx
import { DataGrid, type DataGridColumnInput } from "@cellora/react"

const columns: DataGridColumnInput<Employee>[] = [
  { id: "name", header: "Name", accessor: (row) => row.name, sortable: true },
  { id: "salary", header: "Salary", accessor: (row) => row.salary, align: "right", sortable: true, cell: (row) => formatMoney(row.salary) },
]

<DataGrid rows={rows} columns={columns} getRowId={(row) => row.id} enableSorting enableSearch enableRowSelection />
```

Rules of thumb:

- Every feature is a prop (`enableSorting`, `enableSearch`, `enableRowSelection`, `enableEditing`, `virtualized`, `enableGroupPanel`, `enableFooterRow`, …). Defaults: pagination on, sorting and search off, fixed column widths, sticky header, 400px height cap.
- `accessor` returns the raw value (used for sort / search / filter); `cell` only formats what is shown.
- Per-column rules: `sortValue` / `compare` (ordering), `searchValue` / `searchable` (search box), `filterValue` / `filterMatch` (column filter). Grid-wide: `ignoreAccents` (default true, "nguyen" finds "Nguyễn"), `searchFilter(row, term)`.
- Server-side data: `manualSorting`, `manualFiltering`, `manualPagination`, `rowCount`, `onStateChange(state)`; controlled `sort` / `filter` / `columnFilters` / `pageIndex` and their `default*` twins.
- The grid never mutates `rows`. Editing reports through `onCellEdit`; selection through `onSelectionChange` (keyed by `getRowId`).
- Customization: `slots` / `components` / JSX parts (`<DataGrid.Toolbar>`, `<DataGrid.Empty>`, …), `classNames` / `styles` per part, `labels` for every string. Columns may be JSX: `<DataGrid.Column field="name" header="Name" />`.
- `virtualized` renders only visible rows and columns (1,000,000 × 100 at 60 fps); it replaces pagination and needs a height cap.
- SSR / SSG / CSR all work: the package is `"use client"`, layout effects are isomorphic, the first screen of a virtual grid is rendered on the server.
- Headless use: `useDataGrid(options)` returns the same `grid` API without rendering; `@cellora/core` has the pure functions (`processRows`, `buildGroupTree`, `foldAccents`, virtual-scroll math).

## Working in this repository (for agents changing Cellora itself)

Layout (bun workspaces):

| Path                    | What                                                                                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core/src`     | Framework-free logic (`@cellora/core`): filtering, sorting, grouping, selection, virtual math.                                                 |
| `packages/react/src`    | The React component (`@cellora/react`): `data-grid/*` (grid, hooks) + `components/ui/*` (shadcn).                                              |
| `apps/playground-react` | Every prop and slot behind a switch, for manual testing (Vite).                                                                                |
| `apps/docs`             | Documentation site (Astro + Starlight), EN under `src/content/docs`, VI under `src/content/docs/vi`, one demo file per feature in `src/demos`. |

Commands: `bun install`, `bun run dev` (packages in watch mode + playground), `bun run dev:docs`, `bun run build`, `bun run build:docs`, `bun run typecheck`, `bun run lint`, `bun run format`.

Conventions that reviewers enforce:

- Pure logic goes in `packages/core` (no React imports there); React only wires it up.
- New behavior = an opt-out prop with a sensible default, a slot for any new UI piece, a `labels` entry for any new string, a switch in the playground, and a docs page (EN + VI) with its own demo and API table.
- Tailwind classes must be literal, canonical strings (no template-built class names). Prettier `printWidth` is 180.
- Memoization matters: rows in virtual mode are memoized on their inputs; keep column and slot objects stable (hoist them or use `useMemo`).
- Never mutate `rows`; never block the main thread per scroll event (the virtual grid scrolls natively and re-windows once per screen).
- Check with `bun run typecheck && bun run lint && bun run build && bun run build:docs` before claiming a change works.
