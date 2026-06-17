import { useNavigate } from 'react-router-dom'
import AuthForm from '../features/auth/AuthForm'
import { useAuth } from '../features/auth/useAuth'
import type { Credentials } from '../features/auth/api'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleLogin(credentials: Credentials) {
    await login(credentials)
    navigate('/', { replace: true })
  }

  return (
    <AuthForm
      title="Log in"
      submitLabel="Log in"
      onSubmit={handleLogin}
      altPrompt="No account?"
      altTo="/register"
      altLabel="Create one"
    />
  )
}
