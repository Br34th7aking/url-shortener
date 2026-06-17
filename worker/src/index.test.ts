import {
  env,
  createExecutionContext,
  waitOnExecutionContext,
} from "cloudflare:test"
import { afterEach, describe, it, expect, vi } from "vitest"
import worker from "./index"

const AXIOM_INGEST = "https://api.axiom.co/v1/datasets/clicks/ingest"

afterEach(() => vi.unstubAllGlobals())

// A fetch spy that routes by URL: origin /resolve replies with `resolve`
// (or 404 when null), Axiom ingest always 200-OKs. Any other URL throws so a
// stray call fails loudly. Returns the spy so tests can assert on its calls.
function stubFetch(resolve: { long_url: string; expires_at: string | null } | null) {
  const spy = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
    const url = String(input)
    if (url.startsWith("https://api.axiom.co/")) {
      return new Response("", { status: 200 })
    }
    if (url.endsWith("/resolve")) {
      return resolve === null
        ? new Response("", { status: 404 })
        : new Response(JSON.stringify(resolve), { status: 200 })
    }
    throw new Error(`unexpected fetch: ${url}`)
  })
  vi.stubGlobal("fetch", spy)
  return spy
}

function axiomCalls(spy: ReturnType<typeof vi.fn>) {
  return spy.mock.calls.filter(([input]) => String(input).startsWith("https://api.axiom.co/"))
}

async function call(path: string): Promise<Response> {
  const ctx = createExecutionContext()
  const res = await worker.fetch(new Request(`https://edge.test${path}`), env, ctx)
  await waitOnExecutionContext(ctx) // settle ctx.waitUntil (the Axiom POST)
  return res
}

describe("worker fetch", () => {
  it("GET /health returns ok", async () => {
    const res = await call("/health")
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: "ok", service: "worker" })
  })

  it("KV hit -> 302, origin not called, click event sent", async () => {
    const spy = stubFetch(null)
    await env.LINKS.put(
      "hit1234",
      JSON.stringify({ long_url: "https://example.com/x", expires_at: null }),
    )

    const res = await call("/hit1234")

    expect(res.status).toBe(302)
    expect(res.headers.get("Location")).toBe("https://example.com/x")
    // Cache hit must not touch the origin...
    expect(spy.mock.calls.some(([i]) => String(i).endsWith("/resolve"))).toBe(false)
    // ...but it must still fire a click event.
    expect(axiomCalls(spy)).toHaveLength(1)
  })

  it("KV miss -> origin resolve -> 302, KV populated, click event sent", async () => {
    const spy = stubFetch({ long_url: "https://example.com/y", expires_at: null })

    const res = await call("/miss123")

    expect(res.status).toBe(302)
    expect(res.headers.get("Location")).toBe("https://example.com/y")
    expect(await env.LINKS.get("miss123")).not.toBeNull()
    expect(axiomCalls(spy)).toHaveLength(1)
  })

  it("KV miss -> origin resolve call carries the shared secret", async () => {
    const spy = stubFetch({ long_url: "https://example.com/s", expires_at: null })

    await call("/sec1234")

    const resolveCall = spy.mock.calls.find(([i]) => String(i).endsWith("/resolve"))
    expect(resolveCall).toBeDefined()
    const headers = new Headers(resolveCall?.[1]?.headers)
    expect(headers.get("X-Shared-Secret")).toBe("test-secret")
  })

  it("click event hits the Axiom ingest API with auth + code payload", async () => {
    const spy = stubFetch(null)
    await env.LINKS.put(
      "evt1234",
      JSON.stringify({ long_url: "https://example.com/z", expires_at: null }),
    )

    await call("/evt1234")

    const [url, init] = axiomCalls(spy)[0]
    expect(String(url)).toBe(AXIOM_INGEST)
    expect(init?.method).toBe("POST")
    const headers = new Headers(init?.headers)
    expect(headers.get("Authorization")).toBe("Bearer test-token")
    expect(String(init?.body)).toContain("evt1234")
  })

  it("KV miss + origin 404 -> 404, no click event", async () => {
    const spy = stubFetch(null)

    const res = await call("/gone123")

    expect(res.status).toBe(404)
    expect(axiomCalls(spy)).toHaveLength(0)
  })
})
