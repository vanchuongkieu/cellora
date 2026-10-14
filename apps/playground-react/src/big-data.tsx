import { CheckIcon, InfoIcon, RefreshCwIcon, TriangleAlertIcon, XIcon } from "lucide-react"
import type { DataGridColumnDef } from "@cellora/react"

import { cn } from "@/lib/utils"

/**
 * Large demo datasets without allocating a million objects: a row is just its
 * index, and every column derives its value from (row, column) with a hash.
 * Deterministic, so the grid renders the same data on every reload.
 */

const WORDS = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel", "india", "juliet", "kilo", "lima", "mike", "november", "oscar", "papa"]
export const STATUSES = ["Active", "Pending", "Paused", "Archived"]

const hash = (row: number, column: number) => (Math.imul(row + 1, 2654435761) ^ Math.imul(column + 1, 40503)) >>> 0

export function makeBigRows(count: number): number[] {
  const rows = new Array<number>(count)
  for (let i = 0; i < count; i++) rows[i] = i
  return rows
}

export function makeBigColumns(count: number): DataGridColumnDef<number>[] {
  return Array.from({ length: count }, (_, c): DataGridColumnDef<number> => {
    const width = 110 + (c % 5) * 30
    if (c === 0) {
      return {
        id: "c0",
        header: "#",
        width: 100,
        align: "right",
        sortable: true,
        accessor: (row) => row + 1,
        cell: (row) => (row + 1).toLocaleString("en-US"),
      }
    }
    switch (c % 4) {
      case 1:
        return {
          id: `c${c}`,
          header: `Name ${c}`,
          width,
          sortable: true,
          accessor: (row) => {
            const h = hash(row, c)
            return `${WORDS[h % WORDS.length]} ${h % 1000}`
          },
        }
      case 2:
        return {
          id: `c${c}`,
          header: `Amount ${c}`,
          width,
          align: "right",
          sortable: true,
          aggregate: "sum",
          accessor: (row) => hash(row, c) % 100000,
          cell: (row) => `$${(hash(row, c) % 100000).toLocaleString("en-US")}`,
        }
      case 3:
        return {
          id: `c${c}`,
          header: `Status ${c}`,
          width,
          sortable: true,
          accessor: (row) => STATUSES[hash(row, c) % STATUSES.length],
        }
      default:
        return {
          id: `c${c}`,
          header: `Code ${c}`,
          width,
          accessor: (row) => `${WORDS[hash(row, c) % WORDS.length]}-${row}`,
        }
    }
  })
}

// ---------------------------------------------------------------------------
// "Rich" columns: realistic cell renderers so rendering bugs are easy to spot
// by eye (alignment, truncation, colors, icons, number formats).
// ---------------------------------------------------------------------------

const DOMAINS = ["ziwhobe.kg", "njonum.pl", "dieni.gn", "fepsa.as", "huwzat.zm", "hoclaha.li", "za.sa", "wudi.fj", "kil.pm", "ob.bh"]
export const CURRENCIES = ["HKD", "THB", "MXN", "EUR", "JPY", "BRL", "USD", "GBP", "SGD", "AUD"]

const viNumber = new Intl.NumberFormat("vi-VN")
const viPrice = new Intl.NumberFormat("vi-VN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const viPercent = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 })

const STATUS = {
  Mở: { icon: InfoIcon, className: "border-blue-500 text-blue-500" },
  Điền: { icon: CheckIcon, className: "border-green-600 text-green-600" },
  "Vật bị loại bỏ": {
    icon: TriangleAlertIcon,
    className: "border-red-500 text-red-500",
  },
  "Đã điền một phần": {
    icon: RefreshCwIcon,
    className: "border-orange-500 text-orange-500",
  },
} as const
type StatusLabel = keyof typeof STATUS
const STATUS_LABELS = Object.keys(STATUS) as StatusLabel[]

function StatusBadge({ label }: { label: StatusLabel }) {
  const { icon: Icon, className } = STATUS[label]
  return (
    <span className={cn("inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-xs", className)}>
      <Icon className="size-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </span>
  )
}

function ProgressCell({ value }: { value: number }) {
  const tone = value >= 70 ? "bg-emerald-700/70" : value >= 30 ? "bg-amber-600/60" : "bg-red-500/80"
  return (
    <div className="relative h-6 w-full overflow-hidden rounded-sm border">
      <div className={cn("absolute inset-y-0 left-0", tone)} style={{ width: `${value}%` }} />
      <span className="relative z-10 block text-center text-xs leading-6">{viPercent.format(value)}%</span>
    </div>
  )
}

export const COMMODITIES = ["Coffee C", "Corn", "Cotton No.2", "Wheat", "Soybeans", "Sugar #11", "Cocoa", "Rice", "Palm Oil", "Rubber", "Oats", "Lean Hogs"]
const CYCLE = 9

const commodityOf = (row: number, c: number) => COMMODITIES[hash(row, c) % COMMODITIES.length]
const emailOf = (row: number, c: number) => {
  const h = hash(row, c)
  return `${WORDS[h % WORDS.length]}${h % 97}@${DOMAINS[(h >>> 8) % DOMAINS.length]}`
}

/**
 * 9 column kinds repeated across `count` columns. Column groups, aggregates and
 * a groupable "Hàng hóa" column are included, so grouping, totals and spanning
 * headers can be checked by eye.
 */
export function makeRichColumns(count: number): DataGridColumnDef<number>[] {
  return Array.from({ length: count }, (_, c): DataGridColumnDef<number> => {
    const cycle = Math.floor(c / CYCLE)
    const suffix = cycle > 0 ? ` ${cycle + 1}` : ""
    const id = `r${c}`
    switch (c % CYCLE) {
      case 0:
        return {
          id,
          header: `#${suffix}`,
          width: 90,
          align: "right",
          sortable: true,
          headerGroup: "Giao dịch",
          accessor: (row) => row + 1,
          cell: (row) => viNumber.format(row + 1),
        }
      case 1:
        return {
          id,
          header: `Hàng hóa${suffix}`,
          width: 170,
          sortable: true,
          headerGroup: "Giao dịch",
          accessor: (row) => commodityOf(row, c),
        }
      case 2:
        return {
          id,
          header: `Email nhà giao dịch${suffix}`,
          width: 230,
          sortable: true,
          headerGroup: "Giao dịch",
          groupable: false,
          accessor: (row) => emailOf(row, c),
          cell: (row) => {
            const email = emailOf(row, c)
            return (
              <a href={`mailto:${email}`} className="underline underline-offset-2 hover:text-primary" onClick={(event) => event.preventDefault()}>
                {email}
              </a>
            )
          },
        }
      case 3:
        return {
          id,
          header: `Số lượng${suffix}`,
          width: 140,
          align: "right",
          sortable: true,
          headerGroup: ["Khối lượng", "Số lượng"],
          aggregate: "sum",
          accessor: (row) => hash(row, c) % 100000,
          cell: (row) => viNumber.format(hash(row, c) % 100000),
          aggregateCell: (value) => <span className="text-blue-500">{viNumber.format(value as number)}</span>,
        }
      case 4:
        return {
          id,
          header: `Số lượng đã đóng gói${suffix}`,
          width: 240,
          sortable: true,
          headerGroup: ["Khối lượng", "Số lượng"],
          aggregate: "avg",
          accessor: (row) => (hash(row, c) % 100000) / 1000,
          cell: (row) => <ProgressCell value={(hash(row, c) % 100000) / 1000} />,
          aggregateCell: (value) => `${viPercent.format(value as number)}% (TB)`,
        }
      case 5:
        return {
          id,
          header: `Đã đầy${suffix}`,
          width: 110,
          align: "center",
          sortable: true,
          headerGroup: ["Khối lượng", "Hoàn tất"],
          accessor: (row) => (hash(row, c) % 3 === 0 ? 1 : 0),
          cell: (row) =>
            hash(row, c) % 3 === 0 ? <CheckIcon className="size-4 text-green-600" aria-label="yes" /> : <XIcon className="size-4 text-muted-foreground" aria-label="no" />,
        }
      case 6:
        return {
          id,
          header: `Trạng thái${suffix}`,
          width: 220,
          sortable: true,
          headerGroup: "Xử lý",
          accessor: (row) => STATUS_LABELS[hash(row, c) % STATUS_LABELS.length],
          cell: (row) => <StatusBadge label={STATUS_LABELS[hash(row, c) % STATUS_LABELS.length]} />,
        }
      case 7:
        return {
          id,
          header: `Đơn giá${suffix}`,
          width: 130,
          align: "right",
          sortable: true,
          headerGroup: ["Giá", "Đơn giá"],
          aggregate: "avg",
          accessor: (row) => (hash(row, c) % 1000000) / 100,
          cell: (row) => viPrice.format((hash(row, c) % 1000000) / 100),
          aggregateCell: (value) => viPrice.format(value as number),
        }
      default:
        return {
          id,
          header: `Đơn giá tiền tệ${suffix}`,
          width: 150,
          sortable: true,
          headerGroup: ["Giá", "Tiền tệ"],
          accessor: (row) => CURRENCIES[hash(row, c) % CURRENCIES.length],
        }
    }
  })
}

/** Column id used by the "Row grouping" switch for each big column set. */
export const RICH_GROUP_COLUMN = "r1"
export const PLAIN_GROUP_COLUMN = "c3"

const toOptions = (values: readonly string[]) => values.map((value) => ({ value, label: value }))

/**
 * Which columns of the big datasets can be edited, and how. Only columns that
 * render plain values (no custom `cell`) qualify, so an edit shows up as typed.
 */
export function getBigEditConfig(id: string, rich: boolean): Partial<DataGridColumnDef<number>> | null {
  const index = Number(id.slice(1))
  if (rich) {
    if (index % CYCLE === 1)
      return {
        editable: true,
        editor: "select",
        editorOptions: toOptions(COMMODITIES),
      }
    if (index % CYCLE === 8)
      return {
        editable: true,
        editor: "select",
        editorOptions: toOptions(CURRENCIES),
      }
    return null
  }
  if (index % 4 === 1)
    return {
      editable: true,
      editor: "text",
      validate: (value) => (String(value ?? "").trim() === "" ? "Name cannot be empty" : null),
    }
  if (index % 4 === 3)
    return {
      editable: true,
      editor: "select",
      editorOptions: toOptions(STATUSES),
    }
  return null
}
