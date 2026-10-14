import type { DataGridColumnInput } from "@cellora/react"

/** Sample rows shared by every demo. Deterministic: server and browser render the same data. */
export interface Employee {
  id: string
  name: string
  email: string
  department: string
  role: string
  status: "Active" | "On leave" | "Inactive"
  salary: number
  startDate: Date
  remote: boolean
}

const FIRST = ["Ava", "Liam", "Mia", "Noah", "Emma", "Lucas", "Chloe", "Ethan", "Linh", "Minh", "Sofia", "Hugo", "Yuki", "Omar", "Léa", "Arjun"]
// Accented names on purpose: the search box finds "Nguyễn" when you type "nguyen"
const LAST = ["Nguyễn", "Smith", "Trần", "García", "Kim", "Martin", "Phạm", "Rossi", "Sato", "Silva", "Brown", "Lê"]

/** "Nguyễn" -> "nguyen": plain ASCII for the e-mail addresses */
const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g")
const toAscii = (text: string) => text.normalize("NFD").replace(COMBINING_MARKS, "").replace(/đ/g, "d").toLowerCase()
export const DEPARTMENTS = ["Engineering", "Design", "Product", "Sales", "Support"]
export const ROLES = ["Junior", "Mid", "Senior", "Lead", "Manager"]
export const STATUSES = ["Active", "On leave", "Inactive"] as const

export function makeEmployees(count: number): Employee[] {
  return Array.from({ length: count }, (_, i) => {
    const first = FIRST[(i * 7) % FIRST.length]
    const last = LAST[(i * 5) % LAST.length]
    return {
      id: `E${String(i + 1).padStart(4, "0")}`,
      name: `${first} ${last}`,
      email: `${toAscii(first)}.${toAscii(last)}${i}@cellora.dev`,
      department: DEPARTMENTS[(i * 3) % DEPARTMENTS.length],
      role: ROLES[(i * 11) % ROLES.length],
      status: STATUSES[i % 7 === 0 ? 2 : i % 5 === 0 ? 1 : 0],
      salary: 40_000 + ((i * 7919) % 90) * 1_000,
      startDate: new Date(2016 + (i % 9), (i * 5) % 12, 1 + ((i * 13) % 28)),
      remote: i % 3 === 0,
    }
  })
}

export const employees = makeEmployees(57)

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
const day = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" })

/** Ready-made columns for the demos that are not about columns. */
export const employeeColumns: DataGridColumnInput<Employee>[] = [
  { id: "name", header: "Name", accessor: (row) => row.name, width: 180 },
  { id: "email", header: "Email", accessor: (row) => row.email, width: 260 },
  { id: "department", header: "Department", accessor: (row) => row.department, width: 150 },
  { id: "role", header: "Role", accessor: (row) => row.role, width: 120 },
  { id: "status", header: "Status", accessor: (row) => row.status, width: 120 },
  { id: "salary", header: "Salary", accessor: (row) => row.salary, align: "right", width: 130, cell: (row) => money.format(row.salary) },
  { id: "startDate", header: "Start date", accessor: (row) => row.startDate, width: 140, cell: (row) => day.format(row.startDate) },
]

export const formatMoney = (value: number) => money.format(value)
export const formatDay = (value: Date) => day.format(value)
