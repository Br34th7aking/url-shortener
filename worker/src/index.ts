export interface Env {
  LINKS: KVNamespace
  // Added in later phases: AXIOM_TOKEN, ORIGIN_URL, SHARED_SECRET.
}

export default {
  async fetch(request: Request, _env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === "/health") {
      return Response.json({ status: "ok", service: "worker" })
    }

    // Phase 1: GET /:code -> KV lookup -> 302 redirect (+ Axiom event).
    return new Response("Not found", { status: 404 })
  },
} satisfies ExportedHandler<Env>
