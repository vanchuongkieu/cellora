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
        PageSidebar: "./src/components/overrides/PageSidebar.astro",
        MarkdownContent: "./src/components/overrides/MarkdownContent.astro",
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
        // Google Analytics 4 with Consent Mode v2: storage is denied by default in
        // the EEA, UK and Switzerland until the cookie banner (CookieConsent.astro)
        // is answered, granted elsewhere. The queue and the page_view config run at
        // once; the gtag.js file itself loads once the page has finished loading.
        {
          tag: "script",
          content: [
            "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}",
            'gtag("consent","default",{ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied",analytics_storage:"denied",wait_for_update:500,region:["AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE","IS","LI","NO","GB","CH"]});',
            'gtag("consent","default",{ad_storage:"granted",ad_user_data:"granted",ad_personalization:"granted",analytics_storage:"granted"});',
            'try{const c=localStorage.getItem("cl-consent");if(c==="granted"||c==="denied")gtag("consent","update",{ad_storage:c,ad_user_data:c,ad_personalization:c,analytics_storage:c})}catch{}',
            'gtag("js",new Date());gtag("config","G-PY8X3WPYCB");',
            'addEventListener("load",()=>{const s=document.createElement("script");s.async=true;s.src="https://www.googletagmanager.com/gtag/js?id=G-PY8X3WPYCB";document.head.appendChild(s)})',
          ].join(""),
        },
        // Loaded on the first user interaction (scroll, touch, pointer, key):
        // the ads stack costs seconds of main-thread time on a slow phone, so
        // it must never compete with the first paint, the demos or Core Web
        // Vitals. A reader who never interacts gets no ads, and no ad value
        // would have come from that visit anyway.
        {
          tag: "script",
          content:
            '(()=>{let d=false;const l=()=>{if(d)return;d=true;const s=document.createElement("script");s.async=true;s.crossOrigin="anonymous";s.src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2241188479493423";document.head.appendChild(s)};for(const e of["pointerdown","pointermove","touchstart","keydown","wheel","scroll"])addEventListener(e,l,{once:true,passive:true})})()',
        },
        // Icons at the sizes Google (48px multiples) and iOS want, next to the SVG
        { tag: "link", attrs: { rel: "icon", type: "image/png", sizes: "96x96", href: "/favicon-96.png" } },
        { tag: "link", attrs: { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" } },
        // Structured data: who publishes the site, what the site is (its name
        // for search results) and what the software is. Breadcrumbs per page
        // are added by the Head override.
        {
          tag: "script",
          attrs: { type: "application/ld+json" },
          content: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                "@id": `${SITE.url}/#organization`,
                name: SITE.name,
                url: SITE.url,
                logo: { "@type": "ImageObject", url: `${SITE.url}/icon-512.png`, width: 512, height: 512 },
                sameAs: [SITE.repo, SITE.npm],
              },
              {
                "@type": "WebSite",
                "@id": `${SITE.url}/#website`,
                name: SITE.name,
                alternateName: ["Cellora data grid", "Cellora docs"],
                url: SITE.url,
                description: SITE.description.en,
                inLanguage: ["en", "vi"],
                publisher: { "@id": `${SITE.url}/#organization` },
              },
              {
                "@type": "SoftwareSourceCode",
                name: SITE.name,
                description: SITE.description.en,
                codeRepository: SITE.repo,
                programmingLanguage: ["TypeScript", "React"],
                runtimePlatform: "React 18 / 19",
                license: "https://opensource.org/licenses/MIT",
                url: SITE.url,
              },
            ],
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
          page("getting-started/ai", "Use with AI (MCP)", "Dùng với AI (MCP)"),
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
        group("Guides", "Hướng dẫn", [
          page("guides/shadcn-data-table-virtual-scroll", "1,000,000 rows in a shadcn table", "Bảng shadcn 1.000.000 dòng"),
          page("guides/server-side-pagination-shadcn-tanstack-query", "Server-side with TanStack Query", "Phía server với TanStack Query"),
          page("guides/editable-shadcn-data-grid", "Editable data grid", "Data grid sửa trực tiếp"),
          page("guides/vietnamese-accent-insensitive-search", "Accent-insensitive search", "Tìm kiếm không dấu"),
          page("guides/migrate-from-shadcn-data-table", "Migrate from shadcn Data Table", "Chuyển từ shadcn Data Table"),
          page("guides/cellora-vs-tanstack-table-ag-grid-mui", "Cellora vs TanStack, AG Grid, MUI", "So sánh với TanStack, AG Grid, MUI"),
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
