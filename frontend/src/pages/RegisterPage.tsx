import { useNavigate } from 'react-router-dom'
import AuthForm from '../features/auth/AuthForm'
import { useAuth } from '../features/auth/useAuth'
import type { Credentials } from '../features/auth/api'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  async function handleRegister(credentials: Credentials) {
    await register(credentials)
    navigate('/', { replace: true })
  }

  return (
    <AuthForm
      title="Create your account"
      submitLabel="Sign up"
      onSubmit={handleRegister}
      altPrompt="Already have an account?"
      altTo="/login"
      altLabel="Log in"
    />
  )
}
