import { createElement, Fragment, isValidElement, useMemo, type ComponentType, type ReactElement, type ReactNode } from "react"
import type { SortDirection } from "@cellora/core"

import { signatureOf } from "./stable"
import type { DataGridApi } from "./use-data-grid"
import type { DataGridCellContext, DataGridColumnDef, DataGridColumnInput, DataGridSlots } from "./types"

/**
 * Other ways to describe the grid, next to the plain `columns` / `slots` props:
 *
 * - columns as JSX: `<DataGrid.Column field="name" header="Name" />`
 * - slots as JSX children: `<DataGrid.Toolbar>…</DataGrid.Toolbar>`
 * - slots as components: `components={{ toolbar: MyToolbar }}`
 * - per-column components: `cellComponent`, `headerComponent`, …
 *
 * Everything funnels into the same `DataGridColumnDef[]` and `DataGridSlots`
 * the grid always used, so the rest of the code does not care which was used.
 */

// ---- Slot names, props and components

/** Every slot name. `satisfies` keeps this list in step with DataGridSlots. */
const SLOT_NAMES = {
  toolbar: true,
  search: true,
  row: true,
  empty: true,
  headerGroup: true,
  groupLabel: true,
  groupIcon: true,
  groupRow: true,
  selectGroup: true,
  groupPanel: true,
  groupChip: true,
  footerRow: true,
  aggregateCell: true,
  editCell: true,
  skeletonCell: true,
  loadingOverlay: true,
  columnMenu: true,
  columnMenuTrigger: true,
  columnMenuExtra: true,
  resizeHandle: true,
  sortIcon: true,
  selectAll: true,
  selectRow: true,
  selectionSummary: true,
  footer: true,
  rowCount: true,
  range: true,
  pageSize: true,
  pageIndicator: true,
  pageNavigation: true,
} as const satisfies Record<keyof DataGridSlots<unknown>, true>

export type DataGridSlotName = keyof typeof SLOT_NAMES

/** Slots that are called with the grid itself (the others get a context object). */
type GridArgSlot = "toolbar" | "search" | "empty" | "groupPanel" | "loadingOverlay" | "footer"

type SlotArg<F> = F extends (arg: infer A) => unknown ? A : never

/** What a slot component receives as props. */
export type DataGridSlotComponentProps<TRow, K extends DataGridSlotName> = K extends GridArgSlot
  ? { grid: DataGridApi<TRow> }
  : K extends "sortIcon"
    ? { direction: SortDirection | null }
    : SlotArg<NonNullable<DataGridSlots<TRow>[K]>>

/** `components` prop: any slot given as a component instead of a function. */
export type DataGridSlotComponents<TRow> = {
  [K in DataGridSlotName]?: ComponentType<DataGridSlotComponentProps<TRow, K>>
}

/** Props of a JSX slot (`<DataGrid.Toolbar>`): content, or a render function, or a component. */
export interface DataGridSlotProps<TRow, K extends DataGridSlotName> {
  children?: ReactNode | NonNullable<DataGridSlots<TRow>[K]>
  /** The slot as a component instead of children */
  component?: ComponentType<DataGridSlotComponentProps<TRow, K>>
}

type SlotPart<K extends DataGridSlotName> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- row type is only known at the call site
  <TRow = any>(props: DataGridSlotProps<TRow, K>): null
  slotName: K
}

/** `<DataGrid.Toolbar>`, `<DataGrid.Empty>`, … one part per slot. */
export type DataGridSlotParts = { [K in DataGridSlotName as Capitalize<K>]: SlotPart<K> }

const capitalize = (name: string) => name.charAt(0).toUpperCase() + name.slice(1)

function createSlotPart<K extends DataGridSlotName>(name: K): SlotPart<K> {
  const part = Object.assign(() => null, { slotName: name, displayName: `DataGrid.${capitalize(name)}` })
  return part as unknown as SlotPart<K>
}

export const SLOT_PARTS = Object.fromEntries((Object.keys(SLOT_NAMES) as DataGridSlotName[]).map((name) => [capitalize(name), createSlotPart(name)])) as DataGridSlotParts

/** Generic form: `<DataGridSlot name="empty">No rows</DataGridSlot>`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- row type is only known at the call site
export function DataGridSlot<K extends DataGridSlotName, TRow = any>(props: { name: K } & DataGridSlotProps<TRow, K>): null {
  void props
  return null
}

// ---- Turning components / children into the slot functions the grid calls

function componentToSlot(name: DataGridSlotName, Component: ComponentType<never>) {
  // Positional slots (toolbar(grid), sortIcon(direction)) become named props
  const toProps = (arg: unknown): object => {
    if (name === "sortIcon") return { direction: arg }
    if (name === "toolbar" || name === "search" || name === "empty" || name === "groupPanel" || name === "loadingOverlay" || name === "footer") return { grid: arg }
    return arg as object
  }
  // As a real element, so hooks work inside the component
  return (arg: unknown) => createElement(Component as ComponentType<object>, toProps(arg))
}

const toFunction = (content: unknown) => (typeof content === "function" ? content : () => content)

/** Children as a flat list; fragments are looked through, functions are kept. */
function flatten(children: unknown): unknown[] {
  if (Array.isArray(children)) return children.flatMap(flatten)
  if (isValidElement<{ children?: unknown }>(children) && children.type === Fragment) return flatten(children.props.children)
  return children === null || children === undefined || typeof children === "boolean" ? [] : [children]
}

function slotNameOf(type: unknown, props: { name?: unknown }): DataGridSlotName | undefined {
  if (type === DataGridSlot && typeof props.name === "string" && props.name in SLOT_NAMES) return props.name as DataGridSlotName
  const name = (type as { slotName?: unknown } | null)?.slotName
  return typeof name === "string" && name in SLOT_NAMES ? (name as DataGridSlotName) : undefined
}

type SlotElement = ReactElement<{ name?: unknown; children?: unknown; component?: ComponentType<never> }>

/** The `<DataGrid.Toolbar>`-style children, with the slot each one declares. */
function collectSlotElements(children: ReactNode): { name: DataGridSlotName; element: SlotElement }[] {
  const found: { name: DataGridSlotName; element: SlotElement }[] = []
  for (const child of flatten(children)) {
    if (!isValidElement<SlotElement["props"]>(child)) continue
    const name = slotNameOf(child.type, child.props)
    if (name) found.push({ name, element: child })
  }
  return found
}

// ---- Slots

export function useResolvedSlots<TRow>(
  slots: DataGridSlots<TRow> | undefined,
  components: DataGridSlotComponents<TRow> | undefined,
  children: ReactNode
): DataGridSlots<TRow> | undefined {
  const declared = collectSlotElements(children)
  // JSX is rebuilt on every render of the parent: the slots are rebuilt only
  // when what was written changes (the functions made from it would otherwise
  // be new every time and re-render every memoized row)
  const signature = signatureOf([components, declared.map(({ name, element }) => [name, element])])
  return useMemo(() => {
    const resolved: Record<string, unknown> = {}
    for (const [name, Component] of Object.entries(components ?? {})) {
      if (Component && name in SLOT_NAMES) resolved[name] = componentToSlot(name as DataGridSlotName, Component as ComponentType<never>)
    }
    // Components first, so JSX children win over them (and both over `slots`)
    for (const { name, element } of declared) {
      resolved[name] = element.props.component ? componentToSlot(name, element.props.component) : toFunction(element.props.children)
    }
    return Object.keys(resolved).length === 0 ? slots : { ...slots, ...(resolved as Partial<DataGridSlots<TRow>>) }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `components` and `declared` are represented by `signature`
  }, [slots, signature])
}

// ---- Columns

/** Props a custom cell component receives. */
export interface DataGridCellComponentProps<TRow> {
  row: TRow
  /** The column's accessor applied to the row */
  value: unknown
  index: number
  column: DataGridColumnDef<TRow>
  grid: DataGridApi<TRow>
}

/** Props a custom header component receives. */
export interface DataGridHeaderComponentProps<TRow> {
  column: DataGridColumnDef<TRow>
  sorted: SortDirection | null
  grid: DataGridApi<TRow>
}

/** Props a custom aggregate component receives. */
export interface DataGridAggregateComponentProps<TRow> {
  value: unknown
  scope: "group" | "total"
  column: DataGridColumnDef<TRow>
}

/** `<DataGrid.Column>` content: a cell render function, a node, or the parts below. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- row type is only known at the call site
export interface DataGridColumnProps<TRow = any> extends Omit<DataGridColumnDef<TRow>, "id" | "accessor"> {
  /** Defaults to `field` */
  id?: string
  /** Read this property of the row. Gives `id` and `accessor` when they are omitted. */
  field?: keyof TRow & string
  accessor?: (row: TRow) => unknown
  /**
   * The cell: a function `(row, ctx) => node`, a static node, or any of
   * `<DataGrid.Column.Header>`, `.Cell`, `.Aggregate`, `.Edit`.
   */
  children?: ReactNode | ((row: TRow, ctx: DataGridCellContext<TRow>) => ReactNode)
}

interface ColumnPartProps<F> {
  children?: ReactNode | F
}

const createColumnPart = <F,>(part: "cell" | "header" | "aggregate" | "edit", label: string) =>
  Object.assign((props: ColumnPartProps<F>) => (void props, null), { columnPart: part, displayName: `DataGrid.Column.${label}` })

/**
 * A column written as JSX. It renders nothing itself: `DataGrid` reads it.
 * Props are the same as a `columns` entry, plus `field` and children.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- row type is only known at the call site
function DataGridColumnBase<TRow = any>(props: DataGridColumnProps<TRow>): null {
  void props
  return null
}

export const DataGridColumn = Object.assign(DataGridColumnBase, {
  /** The cell. Same as passing a function as the column's children. */
  Cell: createColumnPart<(row: never, ctx: never) => ReactNode>("cell", "Cell"),
  /** The header label. Sorting, menu and resize handle stay. */
  Header: createColumnPart<(ctx: never) => ReactNode>("header", "Header"),
  /** The aggregate on group rows and the total row. */
  Aggregate: createColumnPart<(value: unknown, ctx: never) => ReactNode>("aggregate", "Aggregate"),
  /** The editor. Same context as `column.editCell`. */
  Edit: createColumnPart<(ctx: never) => ReactNode>("edit", "Edit"),
})

const fieldAccessors = new Map<string, (row: Record<string, unknown>) => unknown>()
const accessorFor = (field: string) => {
  let accessor = fieldAccessors.get(field)
  if (!accessor) fieldAccessors.set(field, (accessor = (row) => row[field]))
  return accessor
}

function columnFromElement<TRow>(element: ReactElement<DataGridColumnProps<TRow>>): DataGridColumnInput<TRow> {
  const { children, field, id, accessor, ...rest } = element.props
  const columnId = id ?? field
  if (!columnId) throw new Error("DataGrid.Column needs an `id` or a `field`")
  const def: Record<string, unknown> = {
    ...rest,
    id: columnId,
    // No accessor and no field: a display column (see `resolveColumn`)
    accessor: accessor ?? (field ? accessorFor(field) : undefined),
  }
  for (const child of flatten(children)) {
    const part = isValidElement<{ children?: unknown }>(child) ? (child.type as { columnPart?: string }).columnPart : undefined
    if (part && isValidElement<{ children?: unknown }>(child)) {
      const key = { cell: "cell", header: "headerCell", aggregate: "aggregateCell", edit: "editCell" }[part]
      if (key) def[key] = toFunction(child.props.children)
    } else if (!("cell" in def)) {
      // Anything else is the cell itself: a render function or a static node
      def.cell = toFunction(child)
    }
  }
  return def as unknown as DataGridColumnInput<TRow>
}

function collectColumnElements<TRow>(children: ReactNode): ReactElement<DataGridColumnProps<TRow>>[] {
  const elements: ReactElement<DataGridColumnProps<TRow>>[] = []
  for (const child of flatten(children)) {
    if (isValidElement<DataGridColumnProps<TRow>>(child) && child.type === DataGridColumn) elements.push(child)
  }
  return elements
}

const resolvedColumns = new WeakMap<object, unknown>()
const noValue = () => undefined

/**
 * Turns what was written into the column the grid works with (once per column
 * object): applies the `*Component` props, and makes display columns (actions,
 * no data) safe: no sorting, filtering, grouping, totals or editing on them.
 */
function resolveColumn<TRow>(input: DataGridColumnInput<TRow>): DataGridColumnDef<TRow> {
  const { cellComponent: Cell, headerComponent: Header, aggregateComponent: Aggregate, editComponent: Edit } = input
  const display = input.display ?? !input.accessor
  if (!Cell && !Header && !Aggregate && !Edit && !display && input.accessor) return input as DataGridColumnDef<TRow>
  const cached = resolvedColumns.get(input)
  if (cached) return cached as DataGridColumnDef<TRow>
  const column: DataGridColumnDef<TRow> = { ...input, accessor: input.accessor ?? noValue }
  if (display) {
    column.display = true
    column.sortable = false
    column.filterable = false
    column.groupable = false
    column.editable = false
    column.aggregate = undefined
    // Nothing in the menu applies to a column without data, unless asked for
    column.menu = input.menu ?? false
  }
  // A function given directly wins over its component
  if (Cell && !input.cell) {
    column.cell = (row, ctx) => createElement(Cell, { row, value: column.accessor(row), index: ctx.index, column, grid: ctx.grid })
  }
  if (Header && !input.headerCell) {
    column.headerCell = ({ sorted, grid }) => createElement(Header, { column, sorted, grid })
  }
  if (Aggregate && !input.aggregateCell) {
    column.aggregateCell = (value, ctx) => createElement(Aggregate, { value, scope: ctx.scope, column })
  }
  if (Edit && !input.editCell) {
    column.editCell = (ctx) => createElement(Edit, ctx)
  }
  resolvedColumns.set(input, column)
  return column
}

const NO_COLUMNS: readonly never[] = []

/** `columns` plus the `<DataGrid.Column>` children, resolved into what the grid works with. */
export function useResolvedColumns<TRow>(columns: readonly DataGridColumnInput<TRow>[] | undefined, children: ReactNode): readonly DataGridColumnDef<TRow>[] {
  const elements = collectColumnElements<TRow>(children)
  // Same idea as the slots: the elements are new on every render, the columns
  // are only rebuilt when what was written changes
  const signature = elements.length ? signatureOf(elements) : ""
  return useMemo(() => {
    const declared = elements.map(columnFromElement)
    const all = declared.length ? [...(columns ?? NO_COLUMNS), ...declared] : (columns ?? NO_COLUMNS)
    const resolved = all.map(resolveColumn)
    // No column needed changing: keep the caller's array (stable identity)
    return resolved.every((column, index) => column === all[index]) ? (all as readonly DataGridColumnDef<TRow>[]) : resolved
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `elements` is represented by `signature`
  }, [columns, signature])
}
