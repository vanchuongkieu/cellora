/**
 * The Cloudflare Worker behind cellora.vanchuongkieu.com: static docs from the
 * assets binding, plus the MCP server at /mcp fed by the site's llms-full.txt.
 */
import { parseDocs, type DocPage } from "./docs-index"
import { serveMcp } from "./mcp"

interface Env {
  ASSETS: { fetch(request: Request | string): Promise<Response> }
}

/** Parsed pages, kept per isolate and refreshed every few minutes (deploys replace isolates anyway). */
let cache: { at: number; pages: DocPage[] } | undefined
const CACHE_MS = 5 * 60 * 1000

async function loadPages(env: Env, origin: string): Promise<DocPage[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.pages
  const response = await env.ASSETS.fetch(new Request(`${origin}/llms-full.txt`))
  if (!response.ok) throw new Error(`llms-full.txt not found (${response.status})`)
  const pages = parseDocs(await response.text())
  cache = { at: Date.now(), pages }
  return pages
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    // One canonical host: www. goes to the bare subdomain (needs the www custom domain on the Worker)
    if (url.hostname.startsWith("www.")) {
      url.hostname = url.hostname.slice(4)
      return Response.redirect(url.toString(), 301)
    }
    if (url.pathname === "/mcp" || url.pathname === "/mcp/") return serveMcp(request, () => loadPages(env, url.origin))
    return env.ASSETS.fetch(request)
  },
}
