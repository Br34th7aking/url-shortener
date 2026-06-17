import { useState, type FormEvent } from 'react'
import { ApiError } from '../../shared/api/client'
import { useCreateLink } from './useCreateLink'

// Pull the DRF field error off a 400 body ({ long_url: ["..."] }); fall back to
// a generic message for anything else (network error, 500, unexpected shape).
function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const body = error.body as { long_url?: string[] } | null
    if (body?.long_url?.length) return body.long_url[0]
  }
  return 'Something went wrong. Please try again.'
}

export default function ShortenForm() {
  const [url, setUrl] = useState('')
  const mutation = useCreateLink()

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    mutation.mutate(url)
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <form onSubmit={onSubmit} className="flex gap-2">
        {/* type="text", not "url": the server is the validation authority (http/https
            only), so we let it own the rules and surface its message. */}
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a long URL"
          aria-label="Long URL"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {mutation.isPending ? 'Shortening…' : 'Shorten'}
        </button>
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
