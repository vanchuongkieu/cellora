import { useEffect, useMemo, useState } from "react"
import {
  DataGrid,
  type DataGridApi,
  type DataGridState,
  type DataGridColumnInput,
  type DataGridClassNames,
  type DataGridStyles,
  type DataGridCellComponentProps,
  type DataGridHeaderComponentProps,
  type DataGridSlotComponentProps,
  type DataGridSlotComponents,
  type DataGridCellEdit,
  type DataGridEditCellContext,
  type DataGridColumnDef,
  type DataGridSelectionChange,
  type DataGridSlots,
} from "@cellora/react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { getBigEditConfig, makeBigColumns, makeBigRows, makeRichColumns, PLAIN_GROUP_COLUMN, RICH_GROUP_COLUMN } from "@/big-data"
import { employees, type Employee } from "@/data"

// Demo slots work for any row shape, so they are typed loosely on purpose
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any

interface DemoOptions {
  virtualized: boolean
}

const EMPTY_OVERRIDES: ReadonlyMap<string, unknown> = new Map()
/** How many selected ids the onSelectionChange panel prints */
const SHOWN_SELECTED_IDS = 20

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" })

/** A pretend API for the "Server-side" switch: sorts, filters and pages on "the server". */
async function fetchEmployees(all: readonly Employee[], state: DataGridState): Promise<{ rows: Employee[]; total: number }> {
  await new Promise((resolve) => setTimeout(resolve, 500))
  const contains = (value: unknown, text: string) => String(value).toLowerCase().includes(text.trim().toLowerCase())
  let rows = all.filter(
    (row) =>
      (!state.filter || Object.values(row).some((value) => contains(value, state.filter))) &&
      Object.entries(state.columnFilters).every(([id, text]) => contains(row[id as keyof Employee], text))
  )
  if (state.sort) {
    const { columnId, direction } = state.sort
    const key = columnId as keyof Employee
    rows = [...rows].sort((a, b) => (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0) * (direction === "asc" ? 1 : -1))
  }
  const start = state.pageIndex * state.pageSize
  return { rows: rows.slice(start, start + state.pageSize), total: rows.length }
}

const options = (values: readonly string[]) => values.map((value) => ({ value, label: value }))
const DEPARTMENT_OPTIONS = options(["Engineering", "Design", "Product", "Sales", "Support"])
const ROLE_OPTIONS = options(["Junior", "Mid", "Senior", "Lead", "Manager"])
const STATUS_OPTIONS = options(["Active", "On leave", "Inactive"])

const baseColumns: DataGridColumnDef<Employee>[] = [
  {
    id: "name",
    width: 190,
    header: "Name",
    headerGroup: "Cá nhân",
    editable: true,
    validate: (value) => (String(value ?? "").trim() === "" ? "Name cannot be empty" : null),
    accessor: (row) => row.name,
    sortable: true,
  },
  {
    id: "email",
    width: 260,
    header: "Email",
    headerGroup: "Cá nhân",
    editable: true,
    validate: (value) => (/^\S+@\S+\.\S+$/.test(String(value ?? "")) ? null : "Not a valid email"),
    accessor: (row) => row.email,
  },
  {
    id: "department",
    width: 150,
    header: "Department",
    headerGroup: "Công việc",
    editable: true,
    editor: "select",
    editorOptions: DEPARTMENT_OPTIONS,
    accessor: (row) => row.department,
    sortable: true,
  },
  {
    id: "role",
    width: 120,
    header: "Role",
    headerGroup: "Công việc",
    editable: true,
    editor: "select",
    editorOptions: ROLE_OPTIONS,
    accessor: (row) => row.role,
    sortable: true,
  },
  {
    id: "salary",
    width: 120,
    header: "Salary",
    headerGroup: "Lương & trạng thái",
    editable: true,
    editor: "number",
    validate: (value) => (typeof value === "number" && value >= 0 ? null : "Enter an amount of 0 or more"),
    aggregate: "sum",
    accessor: (row) => row.salary,
    sortable: true,
    align: "right",
    cell: (row) => `$${row.salary.toLocaleString("en-US")}`,
  },
  {
    id: "status",
    width: 120,
    header: "Status",
    headerGroup: "Lương & trạng thái",
    editable: true,
    editor: "select",
    editorOptions: STATUS_OPTIONS,
    accessor: (row) => row.status,
    sortable: true,
  },
  {
    id: "joinedAt",
    width: 140,
    header: "Joined",
    headerGroup: "Lương & trạng thái",
    editable: true,
    editor: "date",
    accessor: (row) => row.joinedAt,
    sortable: true,
    cell: (row) => dateFormat.format(row.joinedAt),
  },
]

// One demo per slot, each behind its own switch so they can be tried alone
const SLOT_DEMOS = {
  toolbar: (): DataGridSlots<AnyRow> => ({
    toolbar: (grid) => (
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium">Custom toolbar</span>
        <span className="text-muted-foreground">{grid.result.total} matching rows</span>
      </div>
    ),
  }),
  search: () => ({
    search: (grid) => (
      <input
        className="h-9 w-64 rounded-md border border-dashed bg-transparent px-3 text-sm"
        placeholder="Custom search box…"
        value={grid.state.filter}
        onChange={(event) => grid.setFilter(event.target.value)}
      />
    ),
  }),
  row: ({ virtualized }: DemoOptions) => ({
    row: ({ cells, selected }) => {
      const tint = selected ? "bg-amber-100 dark:bg-amber-900/30" : "bg-amber-50/40 dark:bg-amber-950/10"
      // Table mode wants a <tr>; the virtual row element is provided, so only
      // the content inside it is replaced.
      return virtualized ? <div className={cn("flex w-full", tint)}>{cells}</div> : <tr className={cn("border-b", tint)}>{cells}</tr>
    },
  }),
  empty: () => ({
    empty: () => "Không có nhân viên phù hợp",
  }),
  columnMenu: () => ({
    columnMenu: (ctx) => (
      <button
        type="button"
        className="rounded px-1 text-xs text-muted-foreground hover:text-foreground"
        onClick={(event) => {
          event.stopPropagation()
          ctx.hide()
        }}
      >
        ✕
      </button>
    ),
  }),
  skeletonCell: () => ({
    skeletonCell: () => <span className="text-xs text-muted-foreground">···</span>,
  }),
  loadingOverlay: () => ({
    loadingOverlay: () => <span className="rounded-md border bg-background px-3 py-1 text-sm shadow-sm">Đang tải…</span>,
  }),
  columnMenuTrigger: () => ({
    columnMenuTrigger: () => <span className="text-xs">▾</span>,
  }),
  columnMenuExtra: () => ({
    columnMenuExtra: (ctx) => (
      <div role="menuitem" className="px-2 py-1.5 text-xs text-muted-foreground">
        Extra entry · column id: {ctx.column.id}
      </div>
    ),
  }),
  resizeHandle: () => ({
    resizeHandle: () => <span className="self-center text-xs text-muted-foreground group-hover/resizer:text-foreground">⋮</span>,
  }),
  sortIcon: () => ({
    sortIcon: (direction) => <span className="shrink-0 text-xs">{direction === "asc" ? "▲" : direction === "desc" ? "▼" : "↕"}</span>,
  }),
  selectAll: () => ({
    selectAll: ({ status, disabled, onChange }) => (
      <input
        type="checkbox"
        aria-label="Select all rows"
        disabled={disabled}
        checked={status === "all"}
        ref={(el) => {
          if (el) el.indeterminate = status === "some"
        }}
        onChange={(event) => onChange(event.target.checked)}
      />
    ),
  }),
  selectRow: () => ({
    selectRow: ({ checked, disabled, onChange }) => (
      <input type="checkbox" aria-label="Select row" disabled={disabled} checked={checked} onChange={(event) => onChange(event.target.checked)} />
    ),
  }),
  selectionSummary: () => ({
    selectionSummary: ({ count, total }) => `Đã chọn ${count} / ${total}`,
  }),
  range: () => ({
    range: ({ from, to, total }) => `Hiển thị ${from}–${to} / ${total} nhân viên`,
  }),
  pageSize: () => ({
    pageSize: ({ pageSize, options, onChange }) => (
      <label className="flex items-center gap-2">
        Số dòng
        <select className="h-8 rounded-md border bg-transparent px-2" value={pageSize} onChange={(event) => onChange(Number(event.target.value))}>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    ),
  }),
  pageIndicator: () => ({
    pageIndicator: ({ pageIndex, pageCount }) => `Trang ${pageIndex + 1}/${pageCount}`,
  }),
  pageNavigation: () => ({
    pageNavigation: ({ pageIndex, pageCount, onPageChange }) => (
      <>
        <button type="button" className="rounded border px-2 py-1 disabled:opacity-40" disabled={pageIndex === 0} onClick={() => onPageChange(pageIndex - 1)}>
          Trước
        </button>
        <button type="button" className="rounded border px-2 py-1 disabled:opacity-40" disabled={pageIndex >= pageCount - 1} onClick={() => onPageChange(pageIndex + 1)}>
          Sau
        </button>
      </>
    ),
  }),
  headerGroup: () => ({
    headerGroup: ({ label, columns }) => `${label} · ${columns.length} cột`,
  }),
  groupLabel: () => ({
    groupLabel: ({ label }) => <span className="uppercase">{label}</span>,
  }),
  groupIcon: () => ({
    groupIcon: ({ expanded }) => <span className="font-mono text-sm">{expanded ? "−" : "+"}</span>,
  }),
  groupRow: ({ virtualized }: DemoOptions) => ({
    groupRow: ({ cells, toggle }) =>
      virtualized ? (
        <div className="flex w-full bg-amber-100/60 dark:bg-amber-900/30">{cells}</div>
      ) : (
        <tr className="cursor-pointer border-b bg-amber-100/60 dark:bg-amber-900/30" onClick={toggle}>
          {cells}
        </tr>
      ),
  }),
  footerRow: ({ virtualized }: DemoOptions) => ({
    footerRow: ({ cells }) =>
      virtualized ? <div className="flex w-full bg-blue-100/60 dark:bg-blue-900/30">{cells}</div> : <tr className="bg-blue-100/60 dark:bg-blue-900/30">{cells}</tr>,
  }),
  aggregateCell: () => ({
    aggregateCell: ({ value, scope }) => (
      <span className={scope === "total" ? "font-bold" : "italic"}>Σ {typeof value === "number" ? Math.round(value).toLocaleString() : String(value)}</span>
    ),
  }),
  selectGroup: () => ({
    selectGroup: ({ status, onChange }) => (
      <input
        type="checkbox"
        aria-label="Select group"
        checked={status === "all"}
        ref={(el) => {
          if (el) el.indeterminate = status === "some"
        }}
        onChange={(event) => onChange(event.target.checked)}
      />
    ),
  }),
  groupChip: () => ({
    groupChip: ({ column, remove }) => (
      <span className="inline-flex items-center gap-1 text-blue-600">
        ▦ {column.header}
        <button type="button" onClick={remove} aria-label="remove">
          ✕
        </button>
      </span>
    ),
  }),
  groupPanel: () => ({
    groupPanel: (grid) => <div className="rounded-md border border-dashed px-3 py-2 text-sm">Custom group bar — grouped by: {grid.groupBy.join(" › ") || "nothing"}</div>,
  }),
  editCell: () => ({
    editCell: (ctx) => {
      if (ctx.column.editor === "select" || ctx.column.editor === "checkbox") return null
      return <CustomEditor ctx={ctx} />
    },
  }),
  footer: () => ({
    footer: (grid) => (
      <div className="text-sm text-muted-foreground">
        Custom footer — page {grid.result.pageIndex + 1} of {grid.result.pageCount}
      </div>
    ),
  }),
} satisfies Record<string, (options: DemoOptions) => DataGridSlots<AnyRow>>

/** A custom editor: text box with explicit save / cancel buttons. */
function CustomEditor({ ctx }: { ctx: DataGridEditCellContext<AnyRow> }) {
  const [text, setText] = useState(String(ctx.value ?? ""))
  const [message, setMessage] = useState<string | null>(null)
  const save = async () => {
    const result = await ctx.commit(ctx.column.editor === "number" ? Number(text) : text)
    if (!result.ok) setMessage(result.error ?? "Rejected")
  }
  return (
    <div className="flex w-full items-center gap-1">
      <input
        autoFocus
        className={cn("h-7 min-w-0 flex-1 rounded border px-1 text-sm", message && "border-red-500")}
        title={message ?? undefined}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          event.stopPropagation()
          if (event.key === "Enter") void save()
          if (event.key === "Escape") ctx.cancel()
        }}
      />
      <button type="button" className="px-1 text-green-600" onClick={() => void save()}>
        ✓
      </button>
      <button type="button" className="px-1 text-muted-foreground" onClick={ctx.cancel}>
        ✕
      </button>
    </div>
  )
}

// "Custom styles" demo: the highest level of control, on top of the shadcn theme
const CUSTOM_CLASS_NAMES: DataGridClassNames = {
  scroll: "rounded-xl border-2 border-primary/40 shadow-sm",
  header: "bg-primary/10",
  headerCell: "bg-primary/10 text-primary uppercase tracking-wide text-xs",
  row: "hover:bg-primary/5",
  cell: "font-mono",
  groupRow: "bg-primary/10",
  footerRow: "bg-primary/10 text-primary",
  footer: "rounded-md bg-muted px-3 py-2",
  toolbar: "rounded-md bg-muted p-2",
  groupPanel: "border-primary/50",
  empty: "italic",
}
const CUSTOM_STYLES: DataGridStyles = { cell: { letterSpacing: "0.01em" } }

// Components for the "as components" demos: props are what the slot / column passes in
function BoldCell({ value }: DataGridCellComponentProps<AnyRow>) {
  return <strong className="font-semibold">{String(value ?? "")}</strong>
}

function StarHeader({ column, sorted }: DataGridHeaderComponentProps<AnyRow>) {
  return (
    <span className="italic">
      {column.header} ★{sorted ? ` (${sorted})` : ""}
    </span>
  )
}

// Hooks work inside slot components, which a plain slot function cannot do
function EmptyState({ grid }: DataGridSlotComponentProps<AnyRow, "empty">) {
  const [tries, setTries] = useState(0)
  return (
    <button type="button" className="text-sm text-muted-foreground underline" onClick={() => setTries((count) => count + 1)}>
      Empty component ({grid.result.total} rows) · clicked {tries}×
    </button>
  )
}

function ToolbarStats({ grid }: DataGridSlotComponentProps<AnyRow, "toolbar">) {
  return <div className="text-sm text-muted-foreground">Toolbar component: {grid.result.total} rows</div>
}

const SLOT_COMPONENTS: DataGridSlotComponents<AnyRow> = { toolbar: ToolbarStats, empty: EmptyState }

type SlotKey = keyof typeof SLOT_DEMOS
const SLOT_KEYS = Object.keys(SLOT_DEMOS) as SlotKey[]

const DATASETS = [
  { id: "employees", label: "57 rows × 7 columns", rows: null, columns: null },
  { id: "10k", label: "10,000 × 100", rows: 10_000, columns: 100 },
  { id: "100k", label: "100,000 × 100", rows: 100_000, columns: 100 },
  { id: "1m", label: "1,000,000 × 100", rows: 1_000_000, columns: 100 },
] as const

type DatasetId = (typeof DATASETS)[number]["id"]

const FEATURES = [
  { key: "enableSearch", label: "Search" },
  { key: "enableSorting", label: "Sorting" },
  { key: "enableColumnResizing", label: "Column resizing" },
  { key: "autoFitOnDoubleClick", label: "Double-click fit" },
  { key: "fixedColumnWidths", label: "Fixed column widths" },
  { key: "virtualized", label: "Virtual scroll" },
  { key: "placeholderSkeleton", label: "Skeleton while scrolling fast" },
  { key: "richCells", label: "Rich cells (big data)" },
  { key: "enablePagination", label: "Pagination" },
  { key: "serverSide", label: "Server-side (simulated API sorts, searches, filters, pages)" },
  { key: "loading", label: "Loading" },
  { key: "emptyData", label: "No data yet (skeleton)" },
  { key: "enableColumnMenu", label: "Column menu" },
  { key: "wideMenu", label: "Menu width 320px" },
  { key: "stickyHeader", label: "Sticky header" },
  { key: "bordered", label: "Bordered (lines between columns)" },
  { key: "clicks", label: "Row + cell click (pointer cursor)" },
  { key: "actionColumn", label: "Action column (display column, no data)" },
  { key: "customStyles", label: "Custom styles (classNames, styles)" },
  { key: "fillHeight", label: "Fill the screen height (no page scroll)" },
  { key: "scroll", label: "Scroll (400px)" },
  { key: "pinColumns", label: "Pin first + last column" },
  { key: "stickyDivider", label: "Pinned column divider" },
  { key: "stickyShadow", label: "Pinned column shadow (when scrolled)" },
  { key: "enableEditing", label: "Inline editing" },
  { key: "editOnClick", label: "Edit on single click" },
  { key: "slowSave", label: 'Slow save (700ms, rejects "fail")' },
  { key: "columnGroups", label: "Column groups" },
  { key: "rowGrouping", label: "Row grouping" },
  { key: "groupPanel", label: "Group by bar (drag headers)" },
  { key: "footerRow", label: "Total row" },
  { key: "jsxColumns", label: "Columns as JSX (<DataGrid.Column>)" },
  { key: "columnComponents", label: "Column components (cellComponent, headerComponent)" },
  { key: "jsxSlots", label: "Slots as JSX children (<DataGrid.Toolbar>, <DataGrid.Empty>)" },
  { key: "componentSlots", label: "Slots as components (components prop)" },
  { key: "narrow", label: "Narrow container" },
  { key: "enableRowSelection", label: "Row selection" },
  { key: "selectAllAcrossPages", label: "Select all = every page" },
  { key: "skipInactive", label: "Inactive rows not selectable" },
] as const

type FeatureKey = (typeof FEATURES)[number]["key"]

function Toggle({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id}>{label}</Label>
    </div>
  )
}

export function App() {
  const [features, setFeatures] = useState<Record<FeatureKey, boolean>>({
    enableSearch: false,
    enableSorting: false,
    enableColumnResizing: true,
    autoFitOnDoubleClick: true,
    fixedColumnWidths: true,
    virtualized: false,
    placeholderSkeleton: true,
    richCells: false,
    enablePagination: true,
    serverSide: false,
    loading: false,
    emptyData: false,
    enableColumnMenu: true,
    wideMenu: false,
    stickyHeader: true,
    scroll: true,
    bordered: false,
    clicks: false,
    actionColumn: false,
    customStyles: false,
    fillHeight: false,
    pinColumns: false,
    stickyDivider: false,
    stickyShadow: true,
    enableEditing: false,
    editOnClick: false,
    slowSave: false,
    columnGroups: true,
    rowGrouping: false,
    groupPanel: false,
    footerRow: false,
    jsxColumns: false,
    columnComponents: false,
    jsxSlots: false,
    componentSlots: false,
    narrow: false,
    enableRowSelection: false,
    selectAllAcrossPages: false,
    skipInactive: false,
  })
  const [enabledSlots, setEnabledSlots] = useState<Record<SlotKey, boolean>>(() => Object.fromEntries(SLOT_KEYS.map((key) => [key, false])) as Record<SlotKey, boolean>)
  const [selection, setSelection] = useState<DataGridSelectionChange<AnyRow>>({
    selectedRowIds: [],
    selectedRows: [],
    count: 0,
  })
  const [datasetId, setDatasetId] = useState<DatasetId>("employees")
  const dataset = DATASETS.find((item) => item.id === datasetId) ?? DATASETS[0]
  const isEmployees = dataset.rows === null
  // The "Row grouping" switch groups by a sensible column of each dataset; the
  // column menu can change it afterwards, so the grid reports back through state.
  // It is set from the handlers that change its inputs (switches, dataset).
  const [groupBy, setGroupBy] = useState<readonly string[]>([])
  const syncGroupBy = (next: { rowGrouping: boolean; dataset: DatasetId; rich: boolean }) =>
    setGroupBy(next.rowGrouping ? [next.dataset === "employees" ? "department" : next.rich ? RICH_GROUP_COLUMN : PLAIN_GROUP_COLUMN] : [])

  // Big datasets are just row indexes; building them once per size is cheap
  const bigRows = useMemo(() => (dataset.rows ? makeBigRows(dataset.rows) : null), [dataset.rows])
  const bigColumns = useMemo(() => (dataset.columns ? (features.richCells ? makeRichColumns : makeBigColumns)(dataset.columns) : null), [dataset.columns, features.richCells])

  // Edits: employees are real objects (replace the row); the big datasets are
  // just row numbers, so edited values live in a side table read by the accessor
  const [people, setPeople] = useState(employees)
  // Edits belong to one dataset + column set; switching either starts clean,
  // which a scope key gives for free (no effect needed to clear them)
  const editScope = `${datasetId}|${features.richCells}`
  const [editState, setEditState] = useState<{
    scope: string
    values: ReadonlyMap<string, unknown>
  }>({ scope: editScope, values: new Map() })
  const overrides: ReadonlyMap<string, unknown> = editState.scope === editScope ? editState.values : EMPTY_OVERRIDES
  const [lastEdit, setLastEdit] = useState<string>("")
  const [lastClick, setLastClick] = useState<string>("")

  // "Server-side": the grid reports its state, the pretend API answers with one page
  const serverSide = features.serverSide && isEmployees
  const [serverState, setServerState] = useState<DataGridState>({ sort: null, filter: "", columnFilters: {}, pageIndex: 0, pageSize: 10 })
  // The page remembers which state it answers: loading = no page for this state yet
  const [serverPage, setServerPage] = useState<{ rows: Employee[]; total: number; state: DataGridState | null }>({ rows: [], total: 0, state: null })
  const serverLoading = serverPage.state !== serverState
  useEffect(() => {
    if (!serverSide) return
    let current = true
    void fetchEmployees(people, serverState).then((page) => {
      if (current) setServerPage({ ...page, state: serverState })
    })
    return () => {
      current = false
    }
  }, [serverSide, people, serverState])
  const handleCellEdit = async (edit: DataGridCellEdit<AnyRow>) => {
    if (features.slowSave) await new Promise((resolve) => setTimeout(resolve, 700))
    if (String(edit.value).toLowerCase() === "fail") throw new Error("Server rejected this value")
    if (isEmployees) {
      setPeople((prev) => prev.map((person) => (person === edit.row ? { ...person, [edit.columnId]: edit.value } : person)))
    } else {
      setEditState((prev) => ({
        scope: editScope,
        values: new Map(prev.scope === editScope ? prev.values : EMPTY_OVERRIDES).set(`${edit.row}|${edit.columnId}`, edit.value),
      }))
    }
    setLastEdit(`${edit.rowId ?? edit.index} · ${edit.columnId}: ${String(edit.previousValue)} → ${String(edit.value)}`)
  }

  const columns = useMemo<DataGridColumnInput<AnyRow>[]>(() => {
    const source: DataGridColumnDef<AnyRow>[] = bigColumns
      ? bigColumns.map((column): DataGridColumnDef<AnyRow> => {
          const config = getBigEditConfig(column.id, features.richCells)
          if (!config) return column
          return {
            ...column,
            ...config,
            // Show an edited value instead of the generated one
            accessor: (row: number) => (overrides.has(`${row}|${column.id}`) ? overrides.get(`${row}|${column.id}`) : column.accessor(row)),
          } as DataGridColumnDef<AnyRow>
        })
      : baseColumns
    // A display column: buttons, no data. No accessor, so it is never sorted,
    // filtered, searched or grouped.
    const withActions: DataGridColumnInput<AnyRow>[] = features.actionColumn
      ? [
          ...source,
          {
            id: "actions",
            header: "Actions",
            width: 150,
            cell: (row, { index }) => (
              <div className="flex gap-1">
                <Button size="xs" variant="outline" onClick={() => setLastClick(`Edit → row ${index}`)}>
                  Edit
                </Button>
                <Button size="xs" variant="destructive" onClick={() => setLastClick(`Delete → row ${index}`)}>
                  Delete
                </Button>
              </div>
            ),
          },
        ]
      : source
    // Pin the first column left and the last one right
    return withActions.map((column, index) => {
      const pinned =
        features.pinColumns && index === 0
          ? { ...column, sticky: "left" as const }
          : features.pinColumns && index === withActions.length - 1
            ? { ...column, sticky: "right" as const }
            : column
      // Second column drawn by components instead of functions
      return features.columnComponents && index === 1 ? { ...pinned, cellComponent: BoldCell, headerComponent: StarHeader } : pinned
    })
  }, [features.pinColumns, features.columnComponents, features.actionColumn, bigColumns, overrides, features.richCells])
  const slots = useMemo(
    () => Object.assign({}, ...SLOT_KEYS.filter((key) => enabledSlots[key]).map((key) => SLOT_DEMOS[key]({ virtualized: features.virtualized }))) as DataGridSlots<AnyRow>,
    [enabledSlots, features.virtualized]
  )

  return (
    <main className="mx-auto flex min-h-svh max-w-6xl flex-col gap-4 p-6">
      <header>
        <h1 className="text-lg font-medium">Data Grid playground</h1>
        <p className="text-sm text-muted-foreground">
          Toggle each DataGrid prop and slot below. Press <kbd>d</kbd> to toggle dark mode.
        </p>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Props</h2>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {FEATURES.map(({ key, label }) => (
            <Toggle
              key={key}
              id={key}
              label={label}
              checked={features[key]}
              onChange={(checked) => {
                setFeatures((prev) => ({ ...prev, [key]: checked }))
                if (key === "rowGrouping" || key === "richCells")
                  syncGroupBy({
                    rowGrouping: key === "rowGrouping" ? checked : features.rowGrouping,
                    dataset: datasetId,
                    rich: key === "richCells" ? checked : features.richCells,
                  })
              }}
            />
          ))}
          {/* Data size: same switch UI as everything else; at most one is on */}
          {DATASETS.filter((item) => item.rows !== null).map((item) => (
            <Toggle
              key={item.id}
              id={`data-${item.id}`}
              label={item.label}
              checked={datasetId === item.id}
              onChange={(checked) => {
                const next: DatasetId = checked ? item.id : "employees"
                setDatasetId(next)
                syncGroupBy({
                  rowGrouping: features.rowGrouping,
                  dataset: next,
                  rich: features.richCells,
                })
                // Big data only makes sense virtualized
                setFeatures((prev) => ({ ...prev, virtualized: checked }))
              }}
            />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Slots (one switch each)</h2>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {SLOT_KEYS.map((key) => (
            <Toggle key={key} id={`slot-${key}`} label={key} checked={enabledSlots[key]} onChange={(checked) => setEnabledSlots((prev) => ({ ...prev, [key]: checked }))} />
          ))}
        </div>
      </section>

      {(features.clicks || features.actionColumn) && (
        <section className="rounded-md border bg-muted/30 p-3 text-sm">
          <span className="font-medium">click</span> → {lastClick || <span className="text-muted-foreground">click a row, a cell or an action button</span>}
        </section>
      )}

      {features.enableEditing && (
        <section className="rounded-md border bg-muted/30 p-3 text-sm">
          <span className="font-medium">onCellEdit</span> →{" "}
          {lastEdit || <span className="text-muted-foreground">double-click a cell (Enter / F2 on a focused cell; Tab moves to the next editable cell)</span>}
        </section>
      )}

      {features.serverSide && (
        <section className="rounded-md border bg-muted/30 p-3 text-sm">
          <span className="font-medium">onStateChange</span> →{" "}
          {isEmployees ? <code className="text-xs">{JSON.stringify(serverState)}</code> : <span className="text-muted-foreground">switch to the 57-row dataset</span>}
        </section>
      )}

      {features.enableRowSelection && (
        <section className="rounded-md border bg-muted/30 p-3 text-sm">
          <div>
            <span className="font-medium">onSelectionChange</span> → count: <b>{selection.count}</b>
          </div>
          {/* A few ids only: a million joined into one text node takes the browser seconds to lay out */}
          <div className="mt-1 text-xs break-all text-muted-foreground">
            ids: [{selection.selectedRowIds.slice(0, SHOWN_SELECTED_IDS).join(", ")}
            {selection.count > SHOWN_SELECTED_IDS && `, … +${(selection.count - SHOWN_SELECTED_IDS).toLocaleString()} more`}]
          </div>
        </section>
      )}

      <DataGrid
        className={cn(features.narrow && "max-w-3xl")}
        rows={features.emptyData ? [] : serverSide ? serverPage.rows : (bigRows ?? people)}
        manualSorting={serverSide}
        manualFiltering={serverSide}
        manualPagination={serverSide}
        rowCount={serverSide ? serverPage.total : undefined}
        onStateChange={serverSide ? setServerState : undefined}
        enableEditing={features.enableEditing}
        editTrigger={features.editOnClick ? "click" : "doubleClick"}
        onCellEdit={handleCellEdit}
        virtualized={features.virtualized}
        // Same row height for every dataset (the grid would shrink it to fit a
        // million rows into the browser's maximum element height)
        rowHeight={37}
        virtualPlaceholder={features.placeholderSkeleton ? "skeleton" : "lines"}
        enableHeaderGroups={features.columnGroups}
        enableGroupPanel={features.groupPanel}
        enableFooterRow={features.footerRow}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        loading={features.loading || (serverSide && serverLoading)}
        loadingVariant={serverSide ? "overlay" : "auto"}
        columns={features.jsxColumns ? undefined : columns}
        components={features.componentSlots ? SLOT_COMPONENTS : undefined}
        getRowId={isEmployees ? (row) => row.id : (row) => String(row)}
        slots={slots}
        enableSearch={features.enableSearch}
        enableSorting={features.enableSorting}
        enableColumnResizing={features.enableColumnResizing}
        autoFitOnDoubleClick={features.autoFitOnDoubleClick}
        fixedColumnWidths={features.fixedColumnWidths}
        enablePagination={features.enablePagination}
        enableColumnMenu={features.enableColumnMenu}
        columnMenuWidth={features.wideMenu ? 320 : undefined}
        stickyHeader={features.stickyHeader}
        stickyDivider={features.stickyDivider}
        stickyShadow={features.stickyShadow}
        bordered={features.bordered}
        onRowClick={features.clicks ? (click) => setLastClick(`Row click → row ${click.index}`) : undefined}
        onCellClick={features.clicks ? (click) => setLastClick(`Cell click → row ${click.index}, ${click.column.id}: ${String(click.value)}`) : undefined}
        fillHeight={features.fillHeight}
        classNames={features.customStyles ? CUSTOM_CLASS_NAMES : undefined}
        styles={features.customStyles ? CUSTOM_STYLES : undefined}
        maxHeight={features.scroll ? (features.virtualized ? 520 : 400) : null}
        enableRowSelection={features.enableRowSelection}
        selectAllScope={features.selectAllAcrossPages ? "all" : "page"}
        isRowSelectable={features.skipInactive && isEmployees ? (row) => row.status !== "Inactive" : undefined}
        onSelectionChange={setSelection}
      >
        {features.jsxColumns && columns.map((column) => <DataGrid.Column key={column.id} {...column} />)}
        {features.jsxSlots && (
          <DataGrid.Toolbar>{(grid: DataGridApi<AnyRow>) => <div className="text-sm font-medium">JSX toolbar · {grid.result.total} rows</div>}</DataGrid.Toolbar>
        )}
        {features.jsxSlots && <DataGrid.Empty>Nothing here (JSX child)</DataGrid.Empty>}
      </DataGrid>
    </main>
  )
}

export default App
