# Stability / performance audit — shadcn-data-grid (2026-10-14)

Scope: `packages/core/src`, `packages/react/src`, `apps/playground-react/src` (~7.7k LOC). Focus: bugs, leaks, lag, compatibility, security.
Method: full read of every source file + bun benchmarks (1M rows x 100 cols) + browser checks on the dev server.

## Fixed

| # | Sev | Area | Finding | Evidence | Fix |
|---|-----|------|---------|----------|-----|
| 1 | High | perf | Search filtered synchronously on every keystroke; 1M x 100 no-match = 4.4s freeze per key | bench `search 'zz'` 4388ms | `useDeferredValue` for search + column filters (input echoes at once); number cells skipped when term has letters; typing on narrows previous matches (WeakMap cache per rows array) |
| 2 | High | perf | Row selection per click on 1M rows: select-all status mapped 1M ids + `selectedRows` filter ran twice | bench old 21.6 + 50.9 ms/click, new ~0 ms | id sets cached per target list, `getSelectionStatus` counts from the smaller Set side, `selectedRows` via position lookup when few checked, payload computed once (WeakMap) |
| 3 | High | perf | Inline `getRowId` (normal usage, playground does it) rebuilt the 1M-entry id map every render | bench 81ms/render | id map keyed on `rows` only (documented) |
| 4 | High | perf | Filter/sort/group/totals keyed on column object identity: JSX columns with cell children or inline `columns` reprocessed all rows on every parent render | code: `processed` deps `visibleColumns` | processing keyed on a signature of id/accessor/display/aggregate only |
| 5 | Med | perf | Group header checkbox collected + scanned every row of its group on every render | code | memoized rows / status |
| 6 | Med | bug | Row groups sorted as text: `[-5,-10,1.5,1.25,3]`; dates by weekday name | bench | groups ordered with the sort comparator (shared `core/compare.ts`), empty last |
| 7 | Med | bug | Date editor: `"2026-10-14"` strings shown a day early west of UTC; `2026-02-31` accepted as Mar 3 | bench (TZ=America/New_York) | ISO day kept as-is; rollover rejected |
| 8 | Med | compat | SSR/hydration mismatch: max element height probed in render (server 10M fallback vs client 33M -> different row height) | code | `useMaxElementHeight` via `useSyncExternalStore` (server snapshot = fallback) |
| 9 | Med | compat | No `"use client"`: Next.js App Router server components cannot import the package | code | tsdown `banner: { js: '"use client"' }` (verified in output) |
| 10 | Low | bug | `pageSize` prop changes after mount ignored | code | synced during render (React "adjust state on prop change" pattern) |
| 11 | Low | i18n | Hard-coded strings (Rows per page, Previous/Next page, Page x / y, range, Search rows, Resize column) | code | new `labels`: `rowsPerPage`, `previousPage`, `nextPage`, `pageIndicator`, `range`, `searchRows`, `resizeColumn` |
| 12 | Low | a11y | Virtual rows' `aria-rowindex` ignored column-group header rows | code | offset by header depth |
| 13 | Low | leak | Placeholder fade timer not cleared on unmount | code | cleared in effect cleanup |
| 14 | Low | robustness | `rowHeight <= 0` -> division by zero in windowing | code | clamped to >= 1 |
| 15 | Low | playground | onSelectionChange panel printed every id: select-all on 1M rows froze the page (7MB text node) | browser | prints first 20 + "+N more" |
| 16 | Low | tooling | root `bun run format` failed: prettier missing at root | run | prettier added to root devDependencies |

Shared helpers: `core/src/compare.ts` (`isNil`, `collator`, `compareValues`) replaces duplicates in `process.ts` / `grouping.ts`.

## Checked, no issue
- Security: no `dangerouslySetInnerHTML`/`innerHTML`/`eval`; cell text rendered as React text; selectors use `CSS.escape`. `cn` dep is the official shadcn-ui package.
- Leaks: every listener / ResizeObserver / pointer listener removed; caches are WeakMaps.
- Package output: ESM + CJS + `.d.mts`/`.d.cts`.

## Verification
- `bun run typecheck`, `bun run lint`, `bun run build`, `bun run format`: all exit 0.
- Core: cached vs fresh filter results identical for a typing sequence; group order / date parsing verified.
- Browser (new tab on dev server, closed after): search results correct (alpha 1 -> 1,216, zzz -> 0, Active -> 2,500), no console errors.
- Note: click timings in the dev tab are not usable (background-tab throttling + `console.createTask` stack capture with DevTools attached = ~1s inflation, same gotcha as before). Costs judged from bun algorithm timings.

## Remaining limits (not bugs)
- Full-text search over 100M cells still costs seconds of CPU once per settled query (now off the typing path). For that scale prefer column filters or server-side search.
- `workspace:*` dependency: publish with `bun publish` (rewrites it); plain `npm publish` would not.

## Unresolved questions
- None for the code. Docs deploy target, git init, package/repo names: asked separately.
