import type { ReactNode } from "react"
import { cn } from "cn"
import {
  ArrowDownIcon,
  ArrowLeftToLineIcon,
  ArrowRightToLineIcon,
  ArrowUpIcon,
  CheckIcon,
  Columns3Icon,
  EllipsisVerticalIcon,
  EyeOffIcon,
  ListFilterIcon,
  PinOffIcon,
  Rows3Icon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"

import type { DataGridColumnMenuContext, DataGridColumnMenuItem, DataGridLabels } from "./types"

export type DataGridColumnMenuItems = Partial<Record<DataGridColumnMenuItem, boolean>>

/** Which menu groups apply to this column, given grid and column settings. */
export function getColumnMenuItems<TRow>(ctx: DataGridColumnMenuContext<TRow>, items: DataGridColumnMenuItems): Record<DataGridColumnMenuItem, boolean> {
  const { column } = ctx
  return {
    sort: items.sort !== false && ctx.canSort,
    pin: items.pin !== false && ctx.canPin && column.pinnable !== false,
    group: items.group !== false && ctx.canGroup,
    filter: items.filter !== false && column.filterable !== false,
    hide: items.hide !== false && column.hideable !== false,
    manage: items.manage !== false,
  }
}

interface DataGridColumnMenuProps<TRow> {
  ctx: DataGridColumnMenuContext<TRow>
  visible: Record<DataGridColumnMenuItem, boolean>
  labels: DataGridLabels
  /** Menu width in px or any CSS length. Defaults to 220px. */
  width?: number | string
  className?: string
  triggerClassName?: string
  align?: "start" | "center" | "end"
  /** Replaces the default ⋮ icon */
  trigger?: ReactNode
  /** Appended after the built-in groups */
  extra?: ReactNode
}

const stop = (event: { stopPropagation: () => void }) => event.stopPropagation()

export function DataGridColumnMenu<TRow>({ ctx, visible, labels, width, className, triggerClassName, align = "end", trigger, extra }: DataGridColumnMenuProps<TRow>) {
  // Pinning and grouping live in one block of the menu
  const hasPinItems = visible.pin || visible.group
  const groups = [visible.sort, hasPinItems, visible.filter, visible.hide || visible.manage]
  // A separator goes before a group only if an earlier group is showing
  const showSeparator = (index: number) => groups[index] && groups.slice(0, index).some(Boolean)

  return (
    // Non-modal: a modal menu locks page scroll (and shifts the layout by the
    // scrollbar width). The page keeps scrolling and the menu follows its trigger.
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          className={triggerClassName}
          aria-label={labels.columnMenu}
          // Header click sorts; the menu button must not
          onClick={stop}
        >
          {trigger ?? <EllipsisVerticalIcon />}
        </Button>
      </DropdownMenuTrigger>
      {/* Portaled content still bubbles React events to the header, so stop them */}
      <DropdownMenuContent
        align={align}
        // Flips above/below the trigger as the page scrolls, never touches the
        // viewport edge, and hides once the trigger scrolls out of the grid
        collisionPadding={8}
        hideWhenDetached
        className={cn("w-55", className)}
        style={width === undefined ? undefined : { width }}
        onClick={stop}
        onKeyDown={stop}
      >
        {visible.sort && (
          <>
            <DropdownMenuItem onSelect={() => ctx.setSort("asc")}>
              <ArrowUpIcon />
              {labels.sortAsc}
              {ctx.sorted === "asc" && <CheckIcon className="ml-auto" />}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => ctx.setSort("desc")}>
              <ArrowDownIcon />
              {labels.sortDesc}
              {ctx.sorted === "desc" && <CheckIcon className="ml-auto" />}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => ctx.setSort(null)}>
              <span className="size-4" />
              {labels.sortClear}
              {ctx.sorted === null && <CheckIcon className="ml-auto" />}
            </DropdownMenuItem>
          </>
        )}

        {showSeparator(1) && <DropdownMenuSeparator />}
        {visible.pin && (
          <>
            <DropdownMenuItem onSelect={() => ctx.setPin("left")}>
              <ArrowLeftToLineIcon />
              {labels.pinLeft}
              {ctx.pinned === "left" && <CheckIcon className="ml-auto" />}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => ctx.setPin("right")}>
              <ArrowRightToLineIcon />
              {labels.pinRight}
              {ctx.pinned === "right" && <CheckIcon className="ml-auto" />}
            </DropdownMenuItem>
            {ctx.pinned && (
              <DropdownMenuItem onSelect={() => ctx.setPin(false)}>
                <PinOffIcon />
                {labels.unpin}
              </DropdownMenuItem>
            )}
          </>
        )}
        {visible.group && (
          <DropdownMenuItem onSelect={() => ctx.setGrouped(!ctx.grouped)}>
            <Rows3Icon />
            {ctx.grouped ? labels.ungroup : labels.groupBy}
            {ctx.grouped && <CheckIcon className="ml-auto" />}
          </DropdownMenuItem>
        )}

        {showSeparator(2) && <DropdownMenuSeparator />}
        {visible.filter && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ListFilterIcon />
              {labels.filter}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="p-2">
              <Input
                autoFocus
                value={ctx.filterValue}
                placeholder={labels.filterPlaceholder}
                aria-label={labels.filter}
                onChange={(event) => ctx.setFilter(event.target.value)}
                // Keep typed letters from triggering the menu's typeahead
                onKeyDown={stop}
              />
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}

        {showSeparator(3) && <DropdownMenuSeparator />}
        {visible.hide && (
          <DropdownMenuItem onSelect={ctx.hide}>
            <EyeOffIcon />
            {labels.hideColumn}
          </DropdownMenuItem>
        )}
        {visible.manage && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Columns3Icon />
              {labels.manageColumns}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {ctx.columns
                .filter((column) => column.hideable !== false)
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={!ctx.isHidden(column.id)}
                    onCheckedChange={(checked) => ctx.setHidden(column.id, !checked)}
                    // Keep the submenu open while toggling several columns
                    onSelect={(event) => event.preventDefault()}
                  >
                    {column.header}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        {extra}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
