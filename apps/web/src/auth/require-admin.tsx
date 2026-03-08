import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './auth-context'

export function RequireAdmin() {
  const { user } = useAuth()
  if (user?.role !== 'ADMIN') return <Navigate to="/" replace />
  return <Outlet />
}
