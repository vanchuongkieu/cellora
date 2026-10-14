import { DataGrid, type DataGridLabels } from "@cellora/react"

import { employeeColumns, employees } from "./data"

// Override any string; the rest keep their English default
const vietnamese: Partial<DataGridLabels> = {
  columnMenu: "Tuỳ chọn cột",
  sortAsc: "Sắp xếp tăng dần",
  sortDesc: "Sắp xếp giảm dần",
  sortClear: "Bỏ sắp xếp",
  pinLeft: "Ghim trái",
  pinRight: "Ghim phải",
  unpin: "Bỏ ghim",
  filter: "Lọc",
  filterPlaceholder: "Giá trị lọc...",
  hideColumn: "Ẩn cột",
  manageColumns: "Quản lý cột",
  groupBy: "Nhóm theo cột này",
  ungroup: "Bỏ nhóm",
  selectAll: "Chọn tất cả",
  selectRow: "Chọn dòng",
  selected: (count) => `Đã chọn ${count.toLocaleString("vi-VN")}`,
  searchRows: "Tìm dòng",
  rowsPerPage: "Số dòng mỗi trang",
  previousPage: "Trang trước",
  nextPage: "Trang sau",
  pageIndicator: (page, pageCount) => `Trang ${page} / ${pageCount}`,
  range: (from, to, total) => `${from}–${to} trên ${total}`,
}

export default function LabelsDemo() {
  return (
    <DataGrid
      rows={employees}
      columns={employeeColumns}
      getRowId={(row) => row.id}
      pageSize={5}
      enableSearch
      enableSorting
      enableRowSelection
      searchPlaceholder="Tìm kiếm..."
      emptyMessage="Không có kết quả."
      labels={vietnamese}
    />
  )
}
