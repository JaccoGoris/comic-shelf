import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './auth-context'

export function RequireAuth() {
  const { user, setupComplete } = useAuth()
  if (!setupComplete) return <Navigate to="/setup" replace />
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}
