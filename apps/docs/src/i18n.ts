/** A site path in the given locale (`undefined` = English, served at the root). */
export const localePath = (locale: string | undefined, path: string) => (locale ? `/${locale}${path}` : path)

const STRINGS = {
  en: {
    docs: "Docs",
    features: "Features",
    api: "API",
    getStarted: "Get Started",
    copyPage: "Copy Page",
    copied: "Copied",
    previous: "Previous page",
    next: "Next page",
    toggleTheme: "Toggle theme",
    viewCode: "View Code",
    badge: "1,000,000 rows, still 60 fps",
    builtBy: "Built by",
    sourceOn: "The source code is available on",
    searchStart: "Getting started",
    searchPopular: "Popular",
    searchPages: [
      ["/getting-started/introduction/", "Introduction"],
      ["/getting-started/installation/", "Installation"],
      ["/getting-started/quick-start/", "Quick start"],
      ["/features/sorting/", "Sorting"],
      ["/features/virtual-scroll/", "Virtual scroll"],
      ["/features/server-side/", "Server-side data"],
      ["/features/inline-editing/", "Inline editing"],
      ["/api/data-grid/", "DataGrid props"],
    ] as [path: string, label: string][],
  },
  vi: {
    docs: "Tài liệu",
    features: "Tính năng",
    api: "API",
    getStarted: "Bắt đầu",
    copyPage: "Sao chép trang",
    copied: "Đã chép",
    previous: "Trang trước",
    next: "Trang sau",
    toggleTheme: "Đổi giao diện sáng / tối",
    viewCode: "Xem mã nguồn",
    badge: "1.000.000 dòng, vẫn 60 fps",
    builtBy: "Phát triển bởi",
    sourceOn: "Mã nguồn có trên",
    searchStart: "Bắt đầu",
    searchPopular: "Hay xem",
    searchPages: [
      ["/getting-started/introduction/", "Giới thiệu"],
      ["/getting-started/installation/", "Cài đặt"],
      ["/getting-started/quick-start/", "Bắt đầu nhanh"],
      ["/features/sorting/", "Sắp xếp"],
      ["/features/virtual-scroll/", "Cuộn ảo"],
      ["/features/server-side/", "Dữ liệu phía server"],
      ["/features/inline-editing/", "Sửa trực tiếp"],
      ["/api/data-grid/", "Props của DataGrid"],
    ] as [path: string, label: string][],
  },
}

/** UI strings of the docs chrome for a Starlight locale. */
export const ui = (locale: string | undefined) => (locale === "vi" ? STRINGS.vi : STRINGS.en)
