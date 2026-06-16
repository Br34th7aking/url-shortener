import { describe, it, expect } from "vitest"
import worker from "./index"

const env = {} as never
const ctx = {} as never

describe("worker fetch", () => {
  it("GET /health returns ok", async () => {
    const res = await worker.fetch(new Request("https://x/health"), env, ctx)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: "ok", service: "worker" })
  })

  it("unknown path 404s", async () => {
    const res = await worker.fetch(new Request("https://x/nope"), env, ctx)
    expect(res.status).toBe(404)
  })
})
