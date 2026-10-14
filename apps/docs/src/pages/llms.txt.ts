import type { APIRoute } from "astro"

import { getEnglishDocs, urlOf } from "../llms"
import { SITE } from "../site"

const SECTION_TITLES: Record<string, string> = {
  "getting-started": "Getting started",
  features: "Features",
  guides: "Guides",
  customization: "Customization",
  api: "API reference",
}

/** /llms.txt: what Cellora is and where every page is (llmstxt.org). */
export const GET: APIRoute = async () => {
  const docs = await getEnglishDocs()
  const lines = [
    `# ${SITE.name}`,
    "",
    `> ${SITE.description.en}`,
    "",
    `Packages: \`${SITE.packageName}\` (the React component, ${SITE.npm}) and \`@cellora/core\` (framework-free logic). Source: ${SITE.repo}.`,
    'Install: `npm install @cellora/react`, then `@import "@cellora/react/styles.css";` after Tailwind CSS v4 in your stylesheet. Needs React 18/19 and the shadcn/ui theme variables.',
    "",
    `The complete documentation as one Markdown file: ${SITE.url}/llms-full.txt`,
    `MCP server (Streamable HTTP, read-only, tools list_pages / get_page / search_docs / get_prop): ${SITE.url}/mcp`,
    `Vietnamese version of every page: ${SITE.url}/vi/ (same paths, prefixed with /vi).`,
  ]
  let section = ""
  for (const doc of docs) {
    const current = doc.id.split("/")[0]
    if (current !== section) {
      section = current
      lines.push("", `## ${SECTION_TITLES[section] ?? section}`, "")
    }
    lines.push(`- [${doc.data.title}](${urlOf(doc)}): ${doc.data.description ?? ""}`)
  }
  return new Response(lines.join("\n") + "\n", { headers: { "Content-Type": "text/plain; charset=utf-8" } })
}
