import type { ButtonHTMLAttributes, ReactNode } from "react"

/** Small controls shared by the demos (they are not part of the grid). */

export function DemoButton({ active = false, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      data-active={active || undefined}
      className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors hover:bg-muted data-active:border-foreground data-active:bg-foreground data-active:text-background data-active:hover:bg-foreground ${className}`}
      {...props}
    />
  )
}

export function DemoToolbar({ children }: { children: ReactNode }) {
  return <div className="mb-3 flex flex-wrap items-center gap-2">{children}</div>
}

/** Shows what a callback received, under the grid. */
export function DemoOutput({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-3 rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground">
      <span className="font-semibold text-foreground">{label}</span> → {children}
    </div>
  )
}

/** A colored status pill. */
export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "Active"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
      : status === "On leave"
        ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
        : "bg-muted text-muted-foreground"
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>{status}</span>
}
