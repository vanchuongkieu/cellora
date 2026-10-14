/** Value comparison shared by sorting and grouping, so both order values the same way. */

export function isNil(value: unknown): value is null | undefined {
  return value === null || value === undefined
}

// One shared collator: far cheaper than String#localeCompare with options
export const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
})

/** Numbers and Dates by value, everything else as text in natural order. */
export function compareValues(a: unknown, b: unknown): number {
  if (typeof a === "number" && typeof b === "number") return a - b
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()
  return collator.compare(String(a), String(b))
}
