// Bindings are declared once in env.d.ts (Cloudflare.Env), shared with tests.
export type Env = Cloudflare.Env

interface Resolved {
  long_url: string
  expires_at: string | null
}

function redirect(longUrl: string): Response {
  return new Response(null, { status: 302, headers: { Location: longUrl } })
}

// Fire-and-forget click event to Axiom. ctx.waitUntil keeps the request alive
// for the POST without delaying the 302; failures are swallowed so analytics
// can never break a redirect. Enrichment (referrer/UA/geo) lands in Phase 4.
function sendClickEvent(env: Env, ctx: ExecutionContext, code: string): void {
  ctx.waitUntil(
    fetch(`https://api.axiom.co/v1/datasets/${env.AXIOM_DATASET}/ingest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.AXIOM_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([{ code }]),
    }).catch(() => {}),
  )
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
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
      sendClickEvent(env, ctx, code)
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
    sendClickEvent(env, ctx, code)
    return redirect(data.long_url)
  },
} satisfies ExportedHandler<Env>
