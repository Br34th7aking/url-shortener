// Bindings are declared once in env.d.ts (Cloudflare.Env), shared with tests.
export type Env = Cloudflare.Env

interface Resolved {
  long_url: string
  expires_at: string | null
}

function redirect(longUrl: string): Response {
  return new Response(null, { status: 302, headers: { Location: longUrl } })
}

// A link is expired once its expiry instant has passed. The edge is the
// enforcement point (origin/cleanup may lag), so 410 Gone the visitor.
function isExpired(expiresAt: string | null): boolean {
  return expiresAt !== null && Date.parse(expiresAt) <= Date.now()
}

// Workers KV rejects an expirationTtl under 60s; for shorter-lived links we
// skip the TTL and rely on the isExpired() check (KV entry self-evicts later).
function kvTtlSeconds(expiresAt: string | null): number | undefined {
  if (expiresAt === null) return undefined
  const seconds = Math.floor((Date.parse(expiresAt) - Date.now()) / 1000)
  return seconds >= 60 ? seconds : undefined
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
      const data = JSON.parse(cached) as Resolved
      if (isExpired(data.expires_at)) return new Response("Gone", { status: 410 })
      sendClickEvent(env, ctx, code)
      return redirect(data.long_url)
    }

    // Miss -> ask the origin where this code points. The /resolve endpoint is
    // internal: authenticate with the shared secret the origin expects.
    const res = await fetch(`${env.ORIGIN_URL}/api/v1/links/${code}/resolve`, {
      headers: { "X-Shared-Secret": env.SHARED_SECRET },
    })
    if (!res.ok) {
      return new Response("Not found", { status: 404 })
    }

    const data = (await res.json()) as Resolved
    // Already expired at the origin: 410 without caching a dead link.
    if (isExpired(data.expires_at)) return new Response("Gone", { status: 410 })

    // Write through (TTL = remaining lifetime) so the next visit is a pure KV
    // hit and KV self-evicts at expiry, then redirect.
    await env.LINKS.put(code, JSON.stringify(data), {
      expirationTtl: kvTtlSeconds(data.expires_at),
    })
    sendClickEvent(env, ctx, code)
    return redirect(data.long_url)
  },
} satisfies ExportedHandler<Env>
