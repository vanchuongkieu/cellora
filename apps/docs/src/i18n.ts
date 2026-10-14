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
  },
}

/** UI strings of the docs chrome for a Starlight locale. */
export const ui = (locale: string | undefined) => (locale === "vi" ? STRINGS.vi : STRINGS.en)
