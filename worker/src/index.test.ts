import {
  env,
  createExecutionContext,
  waitOnExecutionContext,
} from "cloudflare:test"
import { afterEach, describe, it, expect, vi } from "vitest"
import worker from "./index"

afterEach(() => vi.unstubAllGlobals())

async function call(path: string): Promise<Response> {
  const ctx = createExecutionContext()
  const res = await worker.fetch(new Request(`https://edge.test${path}`), env, ctx)
  await waitOnExecutionContext(ctx)
  return res
}

describe("worker fetch", () => {
  it("GET /health returns ok", async () => {
    const res = await call("/health")
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: "ok", service: "worker" })
  })

  it("KV hit -> 302 to long_url, origin never called", async () => {
    const fetchSpy = vi.fn(() => {
      throw new Error("origin must not be called on a KV hit")
    })
    vi.stubGlobal("fetch", fetchSpy)
    await env.LINKS.put(
      "hit1234",
      JSON.stringify({ long_url: "https://example.com/x", expires_at: null }),
    )

    const res = await call("/hit1234")

    expect(res.status).toBe(302)
    expect(res.headers.get("Location")).toBe("https://example.com/x")
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("KV miss -> origin resolve -> 302 and KV populated", async () => {
    const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe("https://origin.test/api/v1/links/miss123/resolve")
      return new Response(
        JSON.stringify({ long_url: "https://example.com/y", expires_at: null }),
        { status: 200 },
      )
    })
    vi.stubGlobal("fetch", fetchSpy)

    const res = await call("/miss123")

    expect(res.status).toBe(302)
    expect(res.headers.get("Location")).toBe("https://example.com/y")
    expect(fetchSpy).toHaveBeenCalledOnce()
    // Cache-aside: the miss must have written through to KV for next time.
    expect(await env.LINKS.get("miss123")).not.toBeNull()
  })

  it("KV miss + origin 404 -> 404", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 404 })))

    const res = await call("/gone123")

    expect(res.status).toBe(404)
  })
})
