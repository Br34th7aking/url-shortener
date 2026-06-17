// Canonical binding types for the Worker. `cloudflare:test` types its `env` as
// `Cloudflare.Env`, and index.ts derives its handler `Env` from the same place,
// so bindings are declared once here. (Mirrors what `wrangler types` generates.)
//   LINKS      — KV namespace (wrangler.toml [[kv_namespaces]])
//   ORIGIN_URL    — Django origin base (wrangler.toml [vars]; overridden in tests)
//   AXIOM_DATASET — Axiom dataset for click events (wrangler.toml [vars])
//   AXIOM_TOKEN   — Axiom ingest token (secret; injected in tests)
// Added in later phases: SHARED_SECRET.
declare namespace Cloudflare {
  interface Env {
    LINKS: KVNamespace
    ORIGIN_URL: string
    AXIOM_DATASET: string
    AXIOM_TOKEN: string
  }
}
