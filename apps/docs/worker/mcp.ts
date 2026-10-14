/**
 * A stateless MCP server (Streamable HTTP transport, JSON responses) that
 * exposes the Cellora documentation as tools and resources. No session, no
 * SSE stream: every POST is answered on its own, which is all an assistant
 * needs to look things up.
 */
import { findApiRows, searchDocs, type DocPage } from "./docs-index"

const PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"]
const SERVER_INFO = { name: "cellora-docs", title: "Cellora documentation", version: "1.0.0" }

interface JsonRpcRequest {
  jsonrpc: "2.0"
  id?: string | number | null
  method: string
  params?: Record<string, unknown>
}

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean }

const TOOLS = [
  {
    name: "list_pages",
    title: "List documentation pages",
    description: "Every page of the Cellora data grid documentation with its slug, title and one-line description. Call this first to find the right page, then get_page.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "get_page",
    title: "Get a documentation page",
    description: "The full Markdown of one page (guide text, API table and the demo source code), by slug such as 'features/sorting' or 'api/data-grid'.",
    inputSchema: { type: "object", properties: { slug: { type: "string", description: "Page slug from list_pages, e.g. features/virtual-scroll" } }, required: ["slug"], additionalProperties: false },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "search_docs",
    title: "Search the documentation",
    description: "Keyword search over every section of the Cellora docs. Returns the best matching sections with an excerpt and the slug to read in full with get_page.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "Words to look for, e.g. 'server side pagination' or 'pinned column shadow'" }, limit: { type: "integer", minimum: 1, maximum: 20, default: 8 } },
      required: ["query"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "get_prop",
    title: "Look up a prop, column option, slot or label",
    description: "Rows of the API tables for one name, e.g. 'virtualized', 'sortValue', 'onStateChange', 'footerRow'. Gives type, default and description, and which page documents it.",
    inputSchema: { type: "object", properties: { name: { type: "string", description: "The exact prop / option / slot / label name" } }, required: ["name"], additionalProperties: false },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  },
]

const text = (value: string): ToolResult => ({ content: [{ type: "text", text: value }] })
const failure = (value: string): ToolResult => ({ content: [{ type: "text", text: value }], isError: true })

function callTool(pages: DocPage[], name: string, args: Record<string, unknown>): ToolResult {
  switch (name) {
    case "list_pages":
      return text(pages.map((page) => `- ${page.slug}: ${page.title}${page.description ? ` — ${page.description}` : ""}`).join("\n"))
    case "get_page": {
      const slug = String(args.slug ?? "").replace(/^\/|\/$/g, "")
      const page = pages.find((item) => item.slug === slug) ?? pages.find((item) => item.slug.endsWith(`/${slug}`))
      if (!page) return failure(`No page with slug "${slug}". Use list_pages to see the slugs.`)
      return text(`# ${page.title}\n\nURL: ${page.url}\n\n${page.body}`)
    }
    case "search_docs": {
      const hits = searchDocs(pages, String(args.query ?? ""), typeof args.limit === "number" ? args.limit : 8)
      if (hits.length === 0) return text("No section matches. Try other words, or list_pages.")
      return text(hits.map((hit) => `## ${hit.title} › ${hit.heading}\nslug: ${hit.slug}\n\n${hit.excerpt}`).join("\n\n---\n\n"))
    }
    case "get_prop": {
      const rows = findApiRows(pages, String(args.name ?? ""))
      if (rows.length === 0) return text(`Nothing named "${String(args.name ?? "")}" in the API tables. Try search_docs.`)
      return text(rows.map((row) => `${row.title} (${row.slug}):\n${row.row}`).join("\n\n"))
    }
    default:
      return failure(`Unknown tool "${name}"`)
  }
}

const RESOURCE_PREFIX = "cellora://docs/"

/** Handle one JSON-RPC request; `null` for notifications (no reply). */
function handle(pages: DocPage[], request: JsonRpcRequest): unknown {
  const { id, method, params = {} } = request
  const reply = (result: unknown) => ({ jsonrpc: "2.0", id, result })
  const error = (code: number, message: string) => ({ jsonrpc: "2.0", id, error: { code, message } })
  if (method.startsWith("notifications/")) return null
  switch (method) {
    case "initialize": {
      const requested = String(params.protocolVersion ?? "")
      return reply({
        protocolVersion: PROTOCOL_VERSIONS.includes(requested) ? requested : PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false }, resources: { subscribe: false, listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: "Documentation of Cellora, the React data grid for shadcn/ui (@cellora/react, @cellora/core). Use search_docs or list_pages to find a page, get_page to read it, get_prop for one prop or option.",
      })
    }
    case "ping":
      return reply({})
    case "tools/list":
      return reply({ tools: TOOLS })
    case "tools/call": {
      const name = String(params.name ?? "")
      const args = (params.arguments ?? {}) as Record<string, unknown>
      return reply(callTool(pages, name, args))
    }
    case "resources/list":
      return reply({ resources: pages.map((page) => ({ uri: RESOURCE_PREFIX + page.slug, name: page.slug, title: page.title, description: page.description, mimeType: "text/markdown" })) })
    case "resources/read": {
      const uri = String(params.uri ?? "")
      const page = pages.find((item) => RESOURCE_PREFIX + item.slug === uri)
      if (!page) return error(-32002, `Resource not found: ${uri}`)
      return reply({ contents: [{ uri, mimeType: "text/markdown", text: `# ${page.title}\n\nURL: ${page.url}\n\n${page.body}` }] })
    }
    default:
      return error(-32601, `Method not found: ${method}`)
  }
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Mcp-Session-Id, MCP-Protocol-Version, Authorization",
}

/** The /mcp endpoint. */
export async function serveMcp(request: Request, loadPages: () => Promise<DocPage[]>): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS })
  if (request.method === "GET") {
    // No server-initiated stream in stateless mode; a browser visit gets a hint instead
    return new Response(`${SERVER_INFO.title}: MCP endpoint. Point an MCP client at this URL (Streamable HTTP).\n`, { status: 405, headers: { ...CORS, Allow: "POST, OPTIONS", "Content-Type": "text/plain; charset=utf-8" } })
  }
  if (request.method !== "POST") return new Response(null, { status: 405, headers: { ...CORS, Allow: "POST, OPTIONS" } })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400, headers: CORS })
  }
  const pages = await loadPages()
  const requests = (Array.isArray(body) ? body : [body]) as JsonRpcRequest[]
  const replies = requests.filter((item) => item && typeof item.method === "string").map((item) => handle(pages, item)).filter((reply) => reply !== null)
  // Only notifications: acknowledged without a body
  if (replies.length === 0) return new Response(null, { status: 202, headers: CORS })
  return Response.json(Array.isArray(body) ? replies : replies[0], { headers: CORS })
}
