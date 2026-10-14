/**
 * The documentation as data for the MCP server: pages parsed from the
 * `llms-full.txt` the site builds, with keyword search over their sections.
 */

export interface DocPage {
  slug: string
  title: string
  description: string
  url: string
  /** Markdown body (demos inlined as code) */
  body: string
}

export interface DocSection {
  slug: string
  title: string
  heading: string
  text: string
}

/** Parse the llms-full.txt format: pages separated by `---`, each starting with `# Title`, `URL:` and `> description`. */
export function parseDocs(text: string): DocPage[] {
  const pages: DocPage[] = []
  for (const chunk of text.split(/\n---\n\n(?=# )/).slice(1)) {
    const title = chunk.match(/^# (.+)$/m)?.[1]?.trim() ?? ""
    const url = chunk.match(/^URL: (\S+)$/m)?.[1] ?? ""
    const description = chunk.match(/^> (.+)$/m)?.[1]?.trim() ?? ""
    const slug = url.replace(/^https?:\/\/[^/]+\//, "").replace(/\/$/, "")
    const bodyStart = chunk.search(/\n\n(?!URL: |> )/)
    const body = bodyStart === -1 ? "" : chunk.slice(bodyStart).trim()
    if (slug) pages.push({ slug, title, description, url, body })
  }
  return pages
}

/** Split a page into its `##` sections (the intro counts as a section). */
export function sectionsOf(page: DocPage): DocSection[] {
  const parts = page.body.split(/^(?=## )/m)
  return parts
    .map((part) => {
      const heading = part.match(/^## (.+)$/m)?.[1]?.trim() ?? "Overview"
      return { slug: page.slug, title: page.title, heading, text: part.replace(/^## .+\n/, "").trim() }
    })
    .filter((section) => section.text)
}

const tokenize = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .match(/[a-z0-9@._-]+/g) ?? []

/** Sections ranked by how many query terms they contain (title and heading count double). */
export function searchDocs(pages: DocPage[], query: string, limit = 8): (DocSection & { score: number; excerpt: string })[] {
  const terms = [...new Set(tokenize(query))]
  if (terms.length === 0) return []
  const hits: (DocSection & { score: number; excerpt: string })[] = []
  for (const page of pages) {
    for (const section of sectionsOf(page)) {
      const haystack = `${section.title} ${section.heading} ${section.text}`.toLowerCase()
      const head = `${section.title} ${section.heading}`.toLowerCase()
      let score = 0
      for (const term of terms) {
        const inText = haystack.split(term).length - 1
        if (inText === 0) continue
        score += Math.min(inText, 5) + (head.includes(term) ? 4 : 0)
      }
      if (score === 0) continue
      // Prefer sections matching every term
      if (terms.every((term) => haystack.includes(term))) score += 6
      const first = terms.map((term) => section.text.toLowerCase().indexOf(term)).filter((i) => i >= 0).sort((a, b) => a - b)[0] ?? 0
      const start = Math.max(0, first - 160)
      const excerpt = (start > 0 ? "…" : "") + section.text.slice(start, start + 480).trim() + (section.text.length > start + 480 ? "…" : "")
      hits.push({ ...section, score, excerpt })
    }
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit)
}

/** Rows of the API tables that mention `name` (a prop, option, slot or label). */
export function findApiRows(pages: DocPage[], name: string): { slug: string; title: string; row: string }[] {
  const needle = name.trim().toLowerCase()
  if (!needle) return []
  const rows: { slug: string; title: string; row: string }[] = []
  for (const page of pages) {
    for (const line of page.body.split("\n")) {
      if (!line.startsWith("|") || /^\|\s*-+/.test(line)) continue
      const firstCell = line.split("|")[1]?.replace(/`/g, "").trim().toLowerCase() ?? ""
      if (firstCell === needle || firstCell.split(/\s*\/\s*|,\s*/).includes(needle)) rows.push({ slug: page.slug, title: page.title, row: line.trim() })
    }
  }
  return rows
}
