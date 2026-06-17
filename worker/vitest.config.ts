import { defineConfig } from "vitest/config"
import { cloudflareTest } from "@cloudflare/vitest-pool-workers"

// vitest-pool-workers v0.16 (vitest 4) exposes a Vite plugin, `cloudflareTest`,
// instead of the old defineWorkersConfig wrapper. It runs tests INSIDE the
// Workers runtime (Miniflare): tests get a real `env` with the LINKS KV binding
// from wrangler.toml. ORIGIN_URL is overridden to a mockable host so the
// cache-aside miss path can be intercepted with fetchMock.
export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.toml" },
      miniflare: {
        bindings: { ORIGIN_URL: "https://origin.test" },
      },
    }),
  ],
})
