/**
 * The documentation as plain Markdown for AI assistants (llms.txt convention,
 * https://llmstxt.org): an index at /llms.txt and the whole English docs at
 * /llms-full.txt. Built from the same MDX pages as the site, with every live
 * demo replaced by its source code.
 */
import { getCollection, type CollectionEntry } from "astro:content"

import { SITE } from "./site"

/** Sidebar order of the sections */
const SECTIONS = ["getting-started", "features", "guides", "customization", "api"]

/** Demo sources by path, as `~/demos/<name>.tsx?raw` imports resolve to */
const demoSources = import.meta.glob<string>("./demos/*.tsx", { query: "?raw", import: "default", eager: true })

type Doc = CollectionEntry<"docs">

/** English pages, in sidebar order (the Vietnamese ones mirror them). */
export async function getEnglishDocs(): Promise<Doc[]> {
  // The Vietnamese tree ("vi", "vi/...") mirrors the English one; landing and 404 are not documentation
  const docs = await getCollection("docs", (entry) => entry.id !== "vi" && !entry.id.startsWith("vi/") && entry.id !== "404" && entry.id !== "index")
  const rank = (doc: Doc) => SECTIONS.indexOf(doc.id.split("/")[0])
  return docs.sort((a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id))
}

export const urlOf = (doc: Doc) => `${SITE.url}/${doc.id}/`

/** The MDX body as plain Markdown: demos inlined as code, components turned into text. */
export function toMarkdown(doc: Doc): string {
  const body = doc.body ?? ""
  // `import code from "~/demos/x.tsx?raw"` -> which demo file each identifier is
  const demoOf: Record<string, string> = {}
  for (const match of body.matchAll(/^import (\w+) from "~\/demos\/([\w-]+)\.tsx\?raw"$/gm)) demoOf[match[1]] = match[2]
  const source = (identifier: string) => {
    const name = demoOf[identifier]
    const code = name ? demoSources[`./demos/${name}.tsx`] : undefined
    return code ? `\`\`\`tsx\n// ${name}.tsx\n${code.trim()}\n\`\`\`` : ""
  }
  return body
    .replace(/^import .*$\n?/gm, "")
    .replace(/<ComponentPreview code=\{(\w+)\}[^>]*>[\s\S]*?<\/ComponentPreview>/g, (_match, identifier: string) => source(identifier))
    .replace(/<InstallTabs packages="([^"]+)"[^>]*\/>/g, (_match, packages: string) => `\`\`\`sh\nnpm install ${packages}\n\`\`\``)
    .replace(
      /<LinkCard title="([^"]+)" description="([^"]+)" href="([^"]+)" \/>/g,
      (_match, title: string, description: string, href: string) => `- [${title}](${SITE.url}${href}): ${description}`
    )
    .replace(/<\/?(Steps|CardGrid)>/g, "")
    .replace(/<Showcase \/>/g, "")
    .replace(/\]\(\/(?!\/)/g, `](${SITE.url}/`) // site-relative links -> absolute
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
