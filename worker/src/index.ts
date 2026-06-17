// Bindings are declared once in env.d.ts (Cloudflare.Env), shared with tests.
export type Env = Cloudflare.Env

interface Resolved {
  long_url: string
  expires_at: string | null
}

function redirect(longUrl: string): Response {
  return new Response(null, { status: 302, headers: { Location: longUrl } })
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === "/health") {
      return Response.json({ status: "ok", service: "worker" })
    }

    // GET /:code -> long_url. Only single-segment codes are links.
    const code = url.pathname.slice(1)
    if (code === "" || code.includes("/")) {
      return new Response("Not found", { status: 404 })
    }

    // Cache-aside: serve from KV when warm; never touch the origin on a hit.
    const cached = await env.LINKS.get(code)
    if (cached !== null) {
      const { long_url } = JSON.parse(cached) as Resolved
      return redirect(long_url)
    }

    // Miss -> ask the origin where this code points.
    const res = await fetch(`${env.ORIGIN_URL}/api/v1/links/${code}/resolve`)
    if (!res.ok) {
      return new Response("Not found", { status: 404 })
    }

    // Write through so the next visit is a pure KV hit, then redirect.
    const data = (await res.json()) as Resolved
    await env.LINKS.put(code, JSON.stringify(data))
    return redirect(data.long_url)
  },
} satisfies ExportedHandler<Env>
