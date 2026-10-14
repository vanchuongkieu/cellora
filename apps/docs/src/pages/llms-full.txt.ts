import type { APIRoute } from "astro"

import { getEnglishDocs, toMarkdown, urlOf } from "../llms"
import { SITE } from "../site"

/** /llms-full.txt: every English page as Markdown, demos included as code. */
export const GET: APIRoute = async () => {
  const docs = await getEnglishDocs()
  const parts = [`# ${SITE.name} documentation`, "", `> ${SITE.description.en}`, "", `Source: ${SITE.repo} · Site: ${SITE.url} · Index: ${SITE.url}/llms.txt`]
  for (const doc of docs) {
    parts.push("", "---", "", `# ${doc.data.title}`, "", `URL: ${urlOf(doc)}`, "")
    if (doc.data.description) parts.push(`> ${doc.data.description}`, "")
    parts.push(toMarkdown(doc))
  }
  return new Response(parts.join("\n") + "\n", { headers: { "Content-Type": "text/plain; charset=utf-8" } })
}
