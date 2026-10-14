import type { CSSProperties } from "react"
import type { DataGridStickyOffset } from "@cellora/core"

// Sticky cells sit on top of a collapsed-border table, so borders would scroll
// away. Inset shadows travel with the cell instead. Full class strings so
// Tailwind can see them.
const BODY_EDGE = {
  left: "shadow-[inset_-1px_0_0_var(--border)]",
  right: "shadow-[inset_1px_0_0_var(--border)]",
} as const

const HEADER_EDGE = {
  none: "shadow-[inset_0_-1px_0_var(--border)]",
  left: "shadow-[inset_0_-1px_0_var(--border),inset_-1px_0_0_var(--border)]",
  right: "shadow-[inset_0_-1px_0_var(--border),inset_1px_0_0_var(--border)]",
} as const

// Shadow beside the innermost pinned column of each side, only while content
// is scrolled under it (the scroll area carries `data-scrolled-start` /
// `-end`, see use-pinned-shadow). It is one smooth gradient strip per cell, a
// pseudo-element that reaches 1px past the cell so it also covers the row line:
// together the cells make one continuous strip. A box-shadow cannot do this
// (it blurs out at the top and bottom of each cell, and its blobs stack up).
// The cell must not clip its overflow: edge cells clip their content in a child.
// Full class strings (Tailwind cannot see built-up ones).
const EDGE_SHADOW = {
  left: "after:pointer-events-none after:absolute after:top-0 after:-bottom-px after:left-full after:w-2.5 after:bg-[linear-gradient(to_right,rgb(0_0_0/0.09),rgb(0_0_0/0.035)_50%,transparent)] after:opacity-0 after:transition-opacity dark:after:bg-[linear-gradient(to_right,rgb(0_0_0/0.4),rgb(0_0_0/0.15)_50%,transparent)] group-data-scrolled-start/grid:after:opacity-100",
  right:
    "after:pointer-events-none after:absolute after:top-0 after:-bottom-px after:right-full after:w-2.5 after:bg-[linear-gradient(to_left,rgb(0_0_0/0.09),rgb(0_0_0/0.035)_50%,transparent)] after:opacity-0 after:transition-opacity dark:after:bg-[linear-gradient(to_left,rgb(0_0_0/0.4),rgb(0_0_0/0.15)_50%,transparent)] group-data-scrolled-end/grid:after:opacity-100",
} as const

// Pinned body cells are opaque, so mirror the row hover/selected tint on them
// (opaque colors, otherwise scrolled content would show through).
const ROW_STATE_BG = "group-hover/row:bg-[color-mix(in_oklch,var(--background),var(--muted)_50%)] group-data-[state=selected]/row:bg-muted"

// Row-group headers are tinted; pinned cells must reproduce it opaquely
const GROUP_BG = "bg-[color-mix(in_oklch,var(--background),var(--muted)_30%)]"

interface StickyCellOptions {
  /** Pinned-column offset, when this cell's column is pinned */
  offset?: DataGridStickyOffset
  /** Header cell (th) vs body cell (td) */
  header: boolean
  /** Header row sticks to the top of the scroll area */
  stickyHeader: boolean
  /** Draw a vertical divider on the innermost pinned column. Off by default. */
  divider?: boolean
  /** Distance from the top where a sticky header cell sticks (stacked header rows). */
  top?: number
  /** Cell of a row-group header: pinned cells match its tinted background. */
  group?: boolean
}

/** Classes + inline offset for any cell that needs `position: sticky`. */
export function getStickyCell({ offset, header, stickyHeader, divider = false, top = 0, group = false }: StickyCellOptions): {
  className: string
  style?: CSSProperties
  /** Innermost pinned column: its overflow must stay visible for the shadow */
  edge: boolean
} {
  const edge = divider && offset?.edge ? offset.side : null
  // Innermost pinned column of its side: shadow while content scrolls under it
  const shadow = offset?.edge ? EDGE_SHADOW[offset.side] : ""
  const style = offset ? { [offset.side]: offset.offset } : undefined

  if (header && stickyHeader) {
    return {
      // Pinned header cells must out-rank both the sticky header and pinned body cells
      className: `sticky bg-background ${offset ? "z-30" : "z-20"} ${HEADER_EDGE[edge ?? "none"]} ${shadow}`,
      style: { ...style, top },
      edge: Boolean(offset?.edge),
    }
  }
  if (offset) {
    return {
      className: `sticky ${group && !header ? GROUP_BG : "bg-background"} ${header ? "z-20" : `z-10 ${ROW_STATE_BG}`} ${edge ? BODY_EDGE[edge] : ""} ${shadow}`,
      style,
      edge: Boolean(offset.edge),
    }
  }
  return { className: "", edge: false }
}

/**
 * A cell of the total row: pinned to the bottom of the scroll area, and to the
 * left / right when its column is pinned.
 */
export function getStickyFooterCell(offset?: DataGridStickyOffset): {
  className: string
  style: CSSProperties
  edge: boolean
} {
  return {
    className: `sticky bottom-0 bg-background font-medium shadow-[inset_0_1px_0_var(--border)] ${offset ? "z-30" : "z-20"} ${offset?.edge ? EDGE_SHADOW[offset.side] : ""}`,
    edge: Boolean(offset?.edge),
    style: {
      ...(offset ? { [offset.side]: offset.offset } : undefined),
      bottom: 0,
    },
  }
}
