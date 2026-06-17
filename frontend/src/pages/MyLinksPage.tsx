import { useMyLinks } from '../features/links/useMyLinks'

export default function MyLinksPage() {
  const { data, isPending, isError } = useMyLinks()

  if (isPending) {
    return <p className="text-sm text-slate-500">Loading your links…</p>
  }
  if (isError) {
    return <p className="text-sm text-red-600">Couldn’t load your links.</p>
  }

  if (data.results.length === 0) {
    return <p className="text-sm text-slate-500">No links yet — shorten one above.</p>
  }

  return (
    <section className="w-full max-w-xl">
      <h2 className="mb-3 text-lg font-semibold">Your links</h2>
      <ul className="flex flex-col gap-2">
        {data.results.map((link) => (
          <li
            key={link.code}
            className="flex items-center justify-between gap-4 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm"
          >
            <a href={link.short_url} className="font-medium text-slate-900 underline">
              {link.short_url}
            </a>
            <span className="truncate text-slate-500" title={link.long_url}>
              {link.long_url}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
