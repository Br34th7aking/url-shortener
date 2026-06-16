import HealthStatus from '../features/health/HealthStatus'

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 bg-slate-50 text-slate-900">
      <h1 className="text-3xl font-bold">URL Shortener</h1>
      <HealthStatus />
    </main>
  )
}
