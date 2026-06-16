import { useHealth } from './useHealth'

export default function HealthStatus() {
  const { data, isLoading, isError } = useHealth()

  if (isLoading) return <p className="text-slate-500">Checking API…</p>
  if (isError || !data) return <p className="text-red-600">API unreachable</p>

  const ok = data.status === 'ok'
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <p className={ok ? 'font-semibold text-green-600' : 'font-semibold text-red-600'}>
        API {ok ? 'healthy' : 'unhealthy'}
      </p>
      <ul className="mt-2 text-sm text-slate-600">
        <li>db: {data.db}</li>
        <li>redis: {data.redis}</li>
      </ul>
    </div>
  )
}
