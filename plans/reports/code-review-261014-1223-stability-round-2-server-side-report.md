# Stability audit round 2 + server-side / custom rules

Date: 2026-10-14 · Scope: `packages/core`, `packages/react`, `apps/playground-react`, `apps/docs` · All fixes applied, verified with `bun run typecheck && lint && build && build:docs`, bun behaviour scripts and headless Chrome.

## Findings and fixes

| #   | Area                   | Severity | Finding                                                                                                                                | Fix                                                                                                                     |
| --- | ---------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 1   | react/declarative      | perf     | JSX slots / columns were wrapped in new functions every render, so `signatureOf` changed every render and every memoized row re-rendered | `signatureOf` compares React elements by type/key/props; signatures are taken from the raw elements before wrapping     |
| 2   | react/data-grid        | perf     | `createSelectionColumn` ran every render → new column object → virtual cell-spec cache miss → every row re-rendered on every render    | `useMemo` keyed on its inputs                                                                                           |
| 3   | react/selection-column | bug      | Select-all targets memoized without `isRowSelectable`: changing the rule kept stale targets                                             | Targets from `grid.selection.selectable` (stable per rule)                                                              |
| 4   | react/use-cell-editing | race     | Overlapping saves (checkbox cells) cleared `pending` when the first finished; a cancelled editor was "closed" again after a late save     | In-flight counter; `openCell` ref checked before closing / notifying                                                     |
| 5   | react (SSR)            | compat   | `useLayoutEffect` warnings on React 18 servers; virtual grid rendered no rows on the server                                             | `useIsomorphicLayoutEffect`; `initialViewportHeight` renders the first screen on server + first paint, hydration-safe    |
| 6   | core/text + process    | feature  | Search/filters were accent-sensitive; no custom rules                                                                                   | `ignoreAccents` (default on, memoized fold, ASCII fast path), `searchFilter`, column `searchable/searchValue/sortValue/compare/filterValue/filterMatch` |
| 7   | core/process + react   | feature  | No way to let an API sort/search/filter/page                                                                                            | `ProcessOptions` manual flags + `rowCount`; grid `onStateChange`, controlled/default state props                        |
| 8   | react/header cells     | bug      | User `classNames.headerCell` (e.g. `bg-primary/5`) replaced the sticky cell's opaque background → scrolled content bled through pinned headers | User classes moved to an inner box over the opaque cell (header cells + column-group cells, table and virtual)           |
| 9   | docs                   | UX       | Dark flash on reload in light mode (Starlight ships `data-theme="dark"`, switches after CSS); FOUT on navigation; language select truncated; content too narrow | `Head.astro` override (theme before CSS, font preloads), lang select `width:auto`, content 56rem, demo min-height        |

Verified: Map/Set/DOM refs by identity in signatures; no listener/observer/timer without cleanup (grep over all src); SSR renderToString of table/virtual/grouped/JSX grids → 0 console errors, 22 virtual rows in HTML; 15/15 core behaviour checks (accents, custom rules, manual mode); 1M-row benchmarks: ASCII search unchanged, Vietnamese first keystroke ~0.7s.

## Not changed (noted)

- Pinned **body** cells still paint `bg-background` over the row's own tint (e.g. `odd:bg-muted/40` stripes) — pre-existing; the same inner-box approach would add a wrapper per cell in virtual mode.
- `onRowClick.rowId` uses the page index for index-based `getRowId`; selection uses the index in `rows`. Only matters for the default index id.
- `formatAggregate` / `toLocaleString` can differ between server and client locales (hydration text mismatch for totals).

## Unresolved

- License not chosen; npm org `cellora` not created; Cloudflare deploy waits for the user's confirmation.
