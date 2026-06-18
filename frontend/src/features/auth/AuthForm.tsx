import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../shared/api/client'
import type { Credentials } from './api'

// Turn an auth failure into a human message: DRF field errors on a 400,
// "invalid credentials" on a 401, generic otherwise.
function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Invalid email or password.'
    const body = error.body as Record<string, unknown> | null
    if (body) {
      // Field errors are arrays (["msg"]); `detail` (e.g. throttling) is a
      // plain string. Handle both — never index into a string.
      for (const field of ['email', 'password', 'detail']) {
        const value = body[field]
        if (typeof value === 'string' && value) return value
        if (Array.isArray(value) && value.length) return String(value[0])
      }
    }
  }
  return 'Something went wrong. Please try again.'
}

interface AuthFormProps {
  title: string
  submitLabel: string
  onSubmit: (credentials: Credentials) => Promise<void>
  altPrompt: string
  altTo: string
  altLabel: string
}

export default function AuthForm({
  title,
  submitLabel,
  onSubmit,
  altPrompt,
  altTo,
  altLabel,
}: AuthFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    try {
      await onSubmit({ email, password })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 bg-slate-50 text-slate-900">
      <h1 className="text-2xl font-bold">{title}</h1>
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-3 rounded-lg border border-slate-200 bg-white px-6 py-5 shadow-sm"
      >
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email"
            autoComplete="email"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-label="Password"
            autoComplete="current-password"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="mt-1 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? 'Please wait…' : submitLabel}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
      <p className="text-sm text-slate-600">
        {altPrompt}{' '}
        <Link to={altTo} className="font-medium text-slate-900 underline">
          {altLabel}
        </Link>
      </p>
    </main>
  )
}
