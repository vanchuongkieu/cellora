export interface Employee {
  id: string
  name: string
  email: string
  department: string
  role: string
  salary: number
  status: "Active" | "On leave" | "Inactive"
  joinedAt: Date
}

const FIRST = ["An", "Binh", "Chi", "Dung", "Giang", "Hoa", "Khanh", "Linh", "Minh", "Nam", "Phuong", "Quan"]
const LAST = ["Nguyen", "Tran", "Le", "Pham", "Hoang", "Vu", "Dang", "Bui"]
const DEPARTMENTS = ["Engineering", "Design", "Product", "Sales", "Support"]
const ROLES = ["Junior", "Mid", "Senior", "Lead", "Manager"]
const STATUSES: Employee["status"][] = ["Active", "Active", "Active", "On leave", "Inactive"]

// Deterministic demo data (no Math.random) so the playground renders the same every reload
export const employees: Employee[] = Array.from({ length: 57 }, (_, i) => {
  const first = FIRST[i % FIRST.length]
  const last = LAST[(i * 3) % LAST.length]
  return {
    id: `emp-${String(i + 1).padStart(3, "0")}`,
    name: `${last} ${first}`,
    email: `${first}.${last}${i}@example.com`.toLowerCase(),
    department: DEPARTMENTS[(i * 7) % DEPARTMENTS.length],
    role: ROLES[(i * 5) % ROLES.length],
    salary: 800 + ((i * 137) % 40) * 50,
    status: STATUSES[(i * 11) % STATUSES.length],
    joinedAt: new Date(2019 + (i % 6), (i * 5) % 12, 1 + ((i * 3) % 27)),
  }
})
