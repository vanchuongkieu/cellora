# @cellora/core

Framework-free logic behind [Cellora](https://cellora.vanchuongkieu.com), the React data grid for shadcn/ui: filtering, sorting, paging, grouping, aggregation, selection and virtual-scroll math. Pure TypeScript, no dependencies.

You normally get it through `@cellora/react`. Use it directly for server-side processing, workers, tests or another UI library:

```ts
import { createInitialState, foldAccents, processRows } from "@cellora/core"

const result = processRows(rows, columns, { ...createInitialState(20), filter: "nguyen" })
// { rows, matchedRows, total, pageCount, pageIndex } — "nguyen" matches "Nguyễn" (ignoreAccents is on by default)

// Rows an API already sorted and paged: skip those steps, keep the total
processRows(page, columns, state, { manualSorting: true, manualPagination: true, rowCount: 1250 })

foldAccents("Trần Thị Đào") // "Tran Thi Dao"
```

Columns can carry their own rules (`sortValue`, `compare`, `searchValue`, `searchable`, `filterValue`, `filterMatch`); `processRows` honours them.

Reference: <https://cellora.vanchuongkieu.com/api/core/>
