// @ts-check
import { defineConfig, passthroughImageService } from "astro/config"
import react from "@astrojs/react"
import starlight from "@astrojs/starlight"
import tailwindcss from "@tailwindcss/vite"

import { SITE } from "./src/site.ts"

/**
 * A sidebar link with its Vietnamese label.
 * @param {string} slug
 * @param {string} label
 * @param {string} vi
 */
const page = (slug, label, vi) => ({ slug, label, translations: { vi } })

/**
 * A sidebar group with its Vietnamese label.
 * @param {string} label
 * @param {string} vi
 * @param {ReturnType<typeof page>[]} items
 */
const group = (label, vi, items) => ({ label, translations: { vi }, items })

export default defineConfig({
  // Canonical URLs, hreflang links and the sitemap are built from this
  site: SITE.url,
  // The site only has SVGs: serve them as they are (no native `sharp` needed)
  image: { service: passthroughImageService() },
  integrations: [
    starlight({
      title: SITE.name,
      description: SITE.description.en,
      favicon: "/favicon.svg",
      defaultLocale: "root",
      locales: {
        root: { label: "English", lang: "en" },
        vi: { label: "Tiếng Việt", lang: "vi" },
      },
      social: [{ icon: "github", label: "GitHub", href: SITE.repo }],
      customCss: ["./src/styles/global.css", "./src/styles/search.css", "./src/styles/responsive.css"],
      // shadcn/ui-style chrome; everything else stays Starlight's
      components: {
        Head: "./src/components/overrides/Head.astro",
        Header: "./src/components/overrides/Header.astro",
        SiteTitle: "./src/components/overrides/SiteTitle.astro",
        PageTitle: "./src/components/overrides/PageTitle.astro",
        Hero: "./src/components/overrides/Hero.astro",
        Pagination: "./src/components/overrides/Pagination.astro",
        Footer: "./src/components/overrides/Footer.astro",
      },
      head: [
        { tag: "meta", attrs: { property: "og:image", content: `${SITE.url}/og.png` } },
        { tag: "meta", attrs: { property: "og:image:width", content: "1200" } },
        { tag: "meta", attrs: { property: "og:image:height", content: "630" } },
        { tag: "meta", attrs: { property: "og:image:alt", content: "Cellora: the React data grid for shadcn/ui" } },
        { tag: "meta", attrs: { name: "twitter:card", content: "summary_large_image" } },
        { tag: "meta", attrs: { name: "twitter:image", content: `${SITE.url}/og.png` } },
        { tag: "meta", attrs: { name: "theme-color", content: "#151515" } },
        // Google AdSense: site verification + the ads loader (async, does not block rendering)
        { tag: "meta", attrs: { name: "google-adsense-account", content: "ca-pub-2241188479493423" } },
        // Google Analytics 4: the queue and the page_view config run at once, the
        // gtag.js file itself loads once the page has finished loading
        {
          tag: "script",
          content:
            'window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag("js",new Date());gtag("config","G-PY8X3WPYCB");addEventListener("load",()=>{const s=document.createElement("script");s.async=true;s.src="https://www.googletagmanager.com/gtag/js?id=G-PY8X3WPYCB";document.head.appendChild(s)})',
        },
        // Loaded after the page is interactive: the 200 KB ads script must not
        // delay the first paint or the demos (Core Web Vitals)
        {
          tag: "script",
          content:
            'addEventListener("load",()=>setTimeout(()=>{const s=document.createElement("script");s.async=true;s.crossOrigin="anonymous";s.src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2241188479493423";document.head.appendChild(s)},1500))',
        },
        {
          tag: "script",
          attrs: { type: "application/ld+json" },
          content: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareSourceCode",
            name: SITE.name,
            description: SITE.description.en,
            codeRepository: SITE.repo,
            programmingLanguage: ["TypeScript", "React"],
            url: SITE.url,
          }),
        },
      ],
      sidebar: [
        group("Getting started", "Bắt đầu", [
          page("getting-started/introduction", "Introduction", "Giới thiệu"),
          page("getting-started/installation", "Installation", "Cài đặt"),
          page("getting-started/quick-start", "Quick start", "Bắt đầu nhanh"),
          page("getting-started/columns", "Columns", "Định nghĩa cột"),
          page("getting-started/jsx-columns", "Columns as JSX", "Cột dạng JSX"),
          page("getting-started/styling", "Styling", "Tuỳ biến giao diện"),
        ]),
        group("Features", "Tính năng", [
          page("features/sorting", "Sorting", "Sắp xếp"),
          page("features/search", "Search", "Tìm kiếm"),
          page("features/column-filters", "Column filters", "Lọc theo cột"),
          page("features/pagination", "Pagination", "Phân trang"),
          page("features/column-resizing", "Column resizing", "Đổi độ rộng cột"),
          page("features/pinned-columns", "Pinned columns", "Ghim cột"),
          page("features/height-and-sticky-header", "Height & sticky header", "Chiều cao & header cố định"),
          page("features/column-menu", "Column menu", "Menu cột"),
          page("features/column-groups", "Column groups", "Nhóm cột"),
          page("features/row-grouping", "Row grouping", "Nhóm dòng"),
          page("features/aggregation", "Aggregation & total row", "Tổng hợp & dòng tổng"),
          page("features/row-selection", "Row selection", "Chọn dòng"),
          page("features/inline-editing", "Inline editing", "Sửa trực tiếp"),
          page("features/row-and-cell-click", "Row & cell click", "Click dòng & ô"),
          page("features/loading-and-empty", "Loading & empty state", "Đang tải & không có dữ liệu"),
          page("features/virtual-scroll", "Virtual scroll", "Cuộn ảo"),
          page("features/server-side", "Server-side data", "Dữ liệu phía server"),
          page("features/display-columns", "Action columns", "Cột thao tác"),
        ]),
        group("Customization", "Tuỳ biến", [
          page("customization/custom-cells", "Custom cells", "Ô tuỳ biến"),
          page("customization/slots", "Slots", "Slot"),
          page("customization/labels", "Labels & i18n", "Nhãn & đa ngôn ngữ"),
        ]),
        group("API reference", "Tham chiếu API", [
          page("api/data-grid", "DataGrid props", "Props của DataGrid"),
          page("api/column", "Column", "Cột"),
          page("api/grid-api", "Grid API", "Grid API"),
          page("api/slots", "Slots reference", "Danh sách slot"),
          page("api/core", "Core (@cellora/core)", "Core (@cellora/core)"),
        ]),
      ],
    }),
    react(),
  ],
  vite: {
    plugins: [tailwindcss()],
    // Starlight's markdown engine loads a native binary that sits next to it.
    // Bundled into the build it cannot find it (bun's isolated installs), so
    // load it from where it is installed.
    ssr: { external: ["satteri"] },
  },
})
