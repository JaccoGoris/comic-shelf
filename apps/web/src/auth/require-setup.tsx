import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './auth-context'

export function RequireSetup() {
  const { setupComplete } = useAuth()
  if (setupComplete) return <Navigate to="/" replace />
  return <Outlet />
}
