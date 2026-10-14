<div align="center">
  <img src="apps/docs/public/favicon.svg" width="88" height="88" alt="Cellora logo" />
  <h1>Cellora</h1>
  <p><strong>The fast, fully customizable React data grid for shadcn/ui.</strong><br />One million rows, smooth as a hundred.</p>

  <p>
    <a href="https://www.npmjs.com/package/@cellora/react"><img src="https://img.shields.io/npm/v/@cellora/react?color=2563eb&label=npm" alt="npm version" /></a>
    <a href="https://www.npmjs.com/package/@cellora/react"><img src="https://img.shields.io/npm/dm/@cellora/react?color=2563eb" alt="npm downloads" /></a>
    <img src="https://img.shields.io/badge/React-18%20%7C%2019-2563eb" alt="React 18 and 19" />
    <img src="https://img.shields.io/badge/Tailwind%20CSS-v4-2563eb" alt="Tailwind CSS v4" />
    <img src="https://img.shields.io/badge/TypeScript-strict-2563eb" alt="TypeScript" />
  </p>

  <p>
    <a href="https://cellora.vanchuongkieu.com"><b>Documentation</b></a> ·
    <a href="https://cellora.vanchuongkieu.com/getting-started/quick-start/">Quick start</a> ·
    <a href="https://cellora.vanchuongkieu.com/api/data-grid/">API</a> ·
    <a href="https://cellora.vanchuongkieu.com/vi/">Tiếng Việt</a>
  </p>
</div>

---

## Why Cellora

- **Looks like your app on day one.** Built from shadcn/ui and Tailwind CSS, styled with your theme tokens, dark mode included.
- **Fast at any size.** Virtual scrolling for rows _and_ columns: 1,000,000 rows × 100 columns scroll natively at 60 fps. Search, sorting and selection stay responsive on large data.
- **Everything is a prop.** Each feature switches on with one prop and has sensible defaults.
- **Every part is replaceable.** 30+ slots (as functions, components or JSX children), per-part `classNames` / `styles`, and every string is a label for i18n.
- **Your data stays yours.** The grid never copies or mutates rows; edits are reported, you decide what to save.

## Features

|                   |                                                                                                                                                                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Data**          | Sorting · accent-insensitive search (`nguyen` finds `Nguyễn`) · per-column filters · pagination · row grouping · aggregates & total row · inline editing (text, number, date, select, checkbox) · row selection kept across pages |
| **Server-side**   | Let an API sort, search, filter and page: `manualSorting` / `manualFiltering` / `manualPagination`, `rowCount`, `onStateChange`, controlled `sort` / `filter` / `columnFilters` / `pageIndex`                                     |
| **Custom rules**  | Per column: `sortValue` / `compare`, `searchValue` / `searchable`, `filterValue` / `filterMatch`. Per grid: `searchFilter(row, term)`, `ignoreAccents`                                                                            |
| **Layout**        | Fixed column widths · drag / double-click / keyboard resizing · pinned columns (left & right) · sticky header · nested column groups · fill-the-screen height                                                                     |
| **Scale**         | Virtual rows and columns · no blank flashes on fast scroll · lightweight rows (any value, not only objects)                                                                                                                       |
| **Customization** | Custom cells, headers, aggregates and editors · 30+ slots · `classNames` / `styles` per part · labels for every string                                                                                                            |
| **Quality**       | TypeScript first · SSR / SSG / CSR (`"use client"`, isomorphic effects, first screen rendered on the server) · accessible (ARIA grid roles, keyboard sorting / resizing / editing)                                                |

## Installation

```sh
pnpm add @cellora/react
# or: npm install @cellora/react · yarn add @cellora/react · bun add @cellora/react
```

Cellora needs **React 18/19**, **Tailwind CSS v4** and the **shadcn/ui theme variables** (`npx shadcn@latest init` sets all of that up). Then import the grid's styles in the CSS file that imports Tailwind:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "@cellora/react/styles.css";
```

Full guide: [Installation](https://cellora.vanchuongkieu.com/getting-started/installation/).

## Quick start

```tsx
import { DataGrid, type DataGridColumnInput } from "@cellora/react"

type Employee = { id: string; name: string; department: string; salary: number }

const columns: DataGridColumnInput<Employee>[] = [
  { id: "name", header: "Name", accessor: (row) => row.name, sortable: true },
  { id: "department", header: "Department", accessor: (row) => row.department, sortable: true },
  {
    id: "salary",
    header: "Salary",
    accessor: (row) => row.salary,
    align: "right",
    sortable: true,
    cell: (row) => `$${row.salary.toLocaleString()}`,
  },
]

export function Employees({ rows }: { rows: Employee[] }) {
  return <DataGrid rows={rows} columns={columns} getRowId={(row) => row.id} enableSorting enableSearch enableRowSelection />
}
```

A million rows? Add `virtualized`:

```tsx
<DataGrid rows={bigRows} columns={columns} getRowId={(row) => row.id} virtualized maxHeight={600} />
```

Data behind an API? The grid keeps the state and you fetch for it:

```tsx
<DataGrid
  rows={page.rows}
  columns={columns}
  manualSorting
  manualFiltering
  manualPagination
  rowCount={page.total}
  onStateChange={(state) => refetch(state)} // { sort, filter, columnFilters, pageIndex, pageSize }
  enableSorting
  enableSearch
/>
```

Works with Vite, Next.js (App Router and Pages), Remix and Astro: server rendering, static generation and client-only rendering alike.

## Documentation

Every feature has its own page with a live demo, copyable code and an API table, in **English** and **Tiếng Việt**: <https://cellora.vanchuongkieu.com>.

| Getting started                                                                 | Features                                                                                                                                                                                                                                  | Customization                                                                 | API                                                                |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [Installation](https://cellora.vanchuongkieu.com/getting-started/installation/) | [Sorting](https://cellora.vanchuongkieu.com/features/sorting/) · [Search](https://cellora.vanchuongkieu.com/features/search/) · [Filters](https://cellora.vanchuongkieu.com/features/column-filters/)                                     | [Custom cells](https://cellora.vanchuongkieu.com/customization/custom-cells/) | [DataGrid props](https://cellora.vanchuongkieu.com/api/data-grid/) |
| [Quick start](https://cellora.vanchuongkieu.com/getting-started/quick-start/)   | [Row grouping](https://cellora.vanchuongkieu.com/features/row-grouping/) · [Aggregation](https://cellora.vanchuongkieu.com/features/aggregation/)                                                                                         | [Slots](https://cellora.vanchuongkieu.com/customization/slots/)               | [Column](https://cellora.vanchuongkieu.com/api/column/)            |
| [Columns](https://cellora.vanchuongkieu.com/getting-started/columns/)           | [Selection](https://cellora.vanchuongkieu.com/features/row-selection/) · [Editing](https://cellora.vanchuongkieu.com/features/inline-editing/)                                                                                            | [Labels & i18n](https://cellora.vanchuongkieu.com/customization/labels/)      | [Grid API](https://cellora.vanchuongkieu.com/api/grid-api/)        |
| [Styling](https://cellora.vanchuongkieu.com/getting-started/styling/)           | [Pinned columns](https://cellora.vanchuongkieu.com/features/pinned-columns/) · [Virtual scroll](https://cellora.vanchuongkieu.com/features/virtual-scroll/) · [Server-side data](https://cellora.vanchuongkieu.com/features/server-side/) |                                                                               | [Core](https://cellora.vanchuongkieu.com/api/core/)                |

### For AI assistants

Connect your assistant to the docs through the **MCP server** at `https://cellora.vanchuongkieu.com/mcp` (remote, nothing to install):

```sh
claude mcp add --transport http cellora https://cellora.vanchuongkieu.com/mcp
```

It offers `list_pages`, `get_page`, `search_docs` and `get_prop`. The docs are also published as Markdown: [`llms.txt`](https://cellora.vanchuongkieu.com/llms.txt) (index) and [`llms-full.txt`](https://cellora.vanchuongkieu.com/llms-full.txt) (every page with its demo code), every page has a **Copy Page** button, and this repository ships an [`AGENTS.md`](AGENTS.md) with the API cheat sheet and the conventions coding agents must follow. Guide: [Use with AI (MCP)](https://cellora.vanchuongkieu.com/getting-started/ai/).

## Packages

| Package                            | Description                                                                                                                             |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| [`@cellora/react`](packages/react) | The `DataGrid` component, its hooks and types.                                                                                          |
| [`@cellora/core`](packages/core)   | Framework-free logic: filtering, sorting, grouping, aggregation, selection, virtual-scroll math. A Vue binding is planned on top of it. |

## Tiếng Việt

Cellora là data grid React nhanh, tuỳ biến hoàn toàn, xây trên shadcn/ui: sắp xếp, tìm kiếm, lọc, nhóm dòng, tổng hợp, sửa trực tiếp, chọn dòng, ghim cột và cuộn ảo cho một triệu dòng. Tài liệu tiếng Việt đầy đủ, mỗi tính năng một trang có demo chạy thật: <https://cellora.vanchuongkieu.com/vi/>.

## Development

This repository is a [bun](https://bun.sh) workspace.

```sh
bun install
bun run dev          # packages in watch mode + playground (Vite)
bun run dev:docs     # documentation site (Astro + Starlight)
```

| Script                | What it does                                                                                                                                                                  |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bun run build`       | Build `@cellora/core` and `@cellora/react` (ESM + CJS + types).                                                                                                               |
| `bun run build:docs`  | Build the packages, then the static docs site into `apps/docs/dist`.                                                                                                          |
| `bun run deploy:docs` | Build and deploy the docs as a Cloudflare Worker with static assets (`wrangler.jsonc`; needs `wrangler login`). Pushes to `main` deploy automatically through Workers Builds. |
| `bun run typecheck`   | TypeScript in every workspace (`astro check` for the docs).                                                                                                                   |
| `bun run lint`        | ESLint (incl. React hooks rules).                                                                                                                                             |
| `bun run format`      | Prettier.                                                                                                                                                                     |

```
packages/
  core/              framework-free logic (@cellora/core)
  react/             React + shadcn/ui components (@cellora/react)
apps/
  playground-react/  every feature behind a switch, for manual testing
  docs/              documentation site (Astro + Starlight, EN + VI)
```

Releasing: `bun run bump 0.2.0` sets both package versions, then commit and push a tag `v0.2.0`. The `Release` GitHub Action publishes `@cellora/core` (when its version is new) and `@cellora/react` to npm with provenance through npm Trusted Publishing, so no token is involved. `bun run release` does the same from a machine (`bun publish` rewrites the `workspace:` dependency; plain `npm publish` does not). `bun run release:dry` packs without publishing.

## Browser support

Current Chrome, Edge, Firefox and Safari, desktop and mobile.

## License

[MIT](LICENSE)
