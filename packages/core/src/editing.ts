/** Built-in cell editors. "select" and "checkbox" need no text parsing. */
export type DataGridEditorType = "text" | "number" | "date" | "select" | "checkbox"

export interface ParsedEditInput {
  value: unknown
  /** Set when the text is not a valid value for the editor type */
  error?: "invalid-number" | "invalid-date"
}

const pad = (value: number) => String(value).padStart(2, "0")

/** yyyy-mm-dd, what <input type="date"> reads and writes */
const DATE_TEXT = /^(\d{4})-(\d{2})-(\d{2})$/

/** The text an editor starts with for a cell value. */
export function formatEditValue(type: DataGridEditorType, value: unknown): string {
  if (value === null || value === undefined) return ""
  if (type === "date") {
    // Already a calendar day: `new Date("2026-10-14")` would read it as UTC
    // midnight and show the day before west of Greenwich
    if (typeof value === "string" && DATE_TEXT.test(value)) return value
    const date = value instanceof Date ? value : new Date(value as string | number)
    // yyyy-mm-dd in local time: what <input type="date"> expects
    return Number.isNaN(date.getTime()) ? "" : `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  }
  return String(value)
}

/** Turn what the user typed into a cell value (empty text becomes null). */
export function parseEditInput(type: DataGridEditorType, text: string): ParsedEditInput {
  if (type === "number") {
    const trimmed = text.trim()
    if (trimmed === "") return { value: null }
    const number = Number(trimmed)
    return Number.isNaN(number) ? { value: null, error: "invalid-number" } : { value: number }
  }
  if (type === "date") {
    const trimmed = text.trim()
    if (trimmed === "") return { value: null }
    const match = DATE_TEXT.exec(trimmed)
    if (!match) return { value: null, error: "invalid-date" }
    const [year, month, day] = [Number(match[1]), Number(match[2]) - 1, Number(match[3])]
    const date = new Date(year, month, day)
    // Date rolls impossible days over (Feb 31 -> Mar 3): reject those instead
    return date.getMonth() === month && date.getDate() === day ? { value: date } : { value: null, error: "invalid-date" }
  }
  return { value: text }
}

/** Whether an edit changed anything (dates compare by time). */
export function isSameEditValue(a: unknown, b: unknown): boolean {
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime()
  return Object.is(a, b)
}
