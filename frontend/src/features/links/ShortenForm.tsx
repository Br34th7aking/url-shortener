import { useState, type FormEvent } from 'react'
import { ApiError } from '../../shared/api/client'
import type { CreateLinkRequest } from './types'
import { useCreateLink } from './useCreateLink'

// Expiry presets -> seconds from now ('' = never).
const EXPIRY_OPTIONS = [
  { label: 'Never expires', value: '' },
  { label: 'In 1 hour', value: '3600' },
  { label: 'In 1 day', value: '86400' },
  { label: 'In 7 days', value: '604800' },
]

// Surface the server's message: a 409 means the alias is taken; a 400 carries
// DRF field errors ({ code | long_url | expires_at: ["..."] }); else generic.
function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409) return 'That alias is already taken.'
    const body = error.body as Record<string, unknown> | null
    if (body) {
      for (const field of ['code', 'long_url', 'expires_at']) {
        const value = body[field]
        if (Array.isArray(value) && value.length) return String(value[0])
      }
    }
  }
  return 'Something went wrong. Please try again.'
}

export default function ShortenForm() {
  const [url, setUrl] = useState('')
  const [alias, setAlias] = useState('')
  const [expiry, setExpiry] = useState('')
  const mutation = useCreateLink()

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const payload: CreateLinkRequest = { long_url: url }
    if (alias.trim()) payload.code = alias.trim()
    if (expiry) {
      payload.expires_at = new Date(
        Date.now() + Number(expiry) * 1000,
      ).toISOString()
    }
    mutation.mutate(payload)
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        {/* type="text", not "url": the server is the validation authority (http/https
            only), so we let it own the rules and surface its message. */}
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a long URL"
          aria-label="Long URL"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
        />
        <div className="flex gap-2">
          <input
            type="text"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            placeholder="Custom alias (optional)"
            aria-label="Custom alias"
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
          />
          <select
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            aria-label="Expiry"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
          >
            {EXPIRY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {mutation.isPending ? 'Shortening…' : 'Shorten'}
          </button>
        </div>
      </form>

      {mutation.isError && (
        <p className="mt-2 text-sm text-red-600">{errorMessage(mutation.error)}</p>
      )}

      {mutation.isSuccess && (
        <div className="mt-3 flex items-center gap-3">
          <a
            href={mutation.data.short_url}
            className="text-sm font-medium text-slate-900 underline"
          >
            {mutation.data.short_url}
          </a>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(mutation.data.short_url)}
            className="rounded-md border border-slate-300 px-3 py-1 text-sm"
          >
            Copy
          </button>
        </div>
      )}
    </div>
  )
}
