// Canonical binding types for the Worker. `cloudflare:test` types its `env` as
// `Cloudflare.Env`, and index.ts derives its handler `Env` from the same place,
// so bindings are declared once here. (Mirrors what `wrangler types` generates.)
//   LINKS      — KV namespace (wrangler.toml [[kv_namespaces]])
//   ORIGIN_URL — Django origin base (wrangler.toml [vars]; overridden in tests)
// Added in later phases: AXIOM_TOKEN, SHARED_SECRET.
declare namespace Cloudflare {
  interface Env {
    LINKS: KVNamespace
    ORIGIN_URL: string
  }
}
