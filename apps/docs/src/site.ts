/**
 * Everything about the project that the docs and SEO depend on, in one place.
 * Point the custom domain at Cloudflare Pages before deploying.
 */
export const SITE = {
  name: "Cellora",
  /** Public URL of the docs (canonical links, sitemap, Open Graph) */
  url: "https://cellora.vanchuongkieu.com",
  repo: "https://github.com/vanchuongkieu/cellora",
  npm: "https://www.npmjs.com/package/@cellora/react",
  packageName: "@cellora/react",
  description: {
    // Under 155 characters: search engines cut longer descriptions
    en: "Fast, fully customizable React data grid built on shadcn/ui: sorting, filtering, grouping, inline editing and virtual scrolling for a million rows.",
    vi: "Data grid React nhanh, tuỳ biến hoàn toàn, xây trên shadcn/ui: sắp xếp, lọc, nhóm, sửa trực tiếp và cuộn ảo cho một triệu dòng.",
  },
} as const
