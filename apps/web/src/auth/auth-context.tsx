import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react'
import { Center, Loader } from '@mantine/core'
import {
  getAuthStatus,
  login as apiLogin,
  logout as apiLogout,
  setup as apiSetup,
} from '../api/client'
import type { UserDto, LoginDto, SetupDto } from '@comic-shelf/shared-types'

interface AuthContextValue {
  user: UserDto | null
  setupComplete: boolean
  loading: boolean
  login: (dto: LoginDto) => Promise<void>
  logout: () => Promise<void>
  setup: (dto: SetupDto) => Promise<void>
  refreshStatus: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null)
  const [setupComplete, setSetupComplete] = useState(false)
  const [loading, setLoading] = useState(true)

  const refreshStatus = useCallback(async () => {
    try {
      const status = await getAuthStatus()
      setSetupComplete(status.setupComplete)
      setUser(status.user)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    refreshStatus().finally(() => setLoading(false))
  }, [refreshStatus])

  const login = async (dto: LoginDto) => {
    const { user: loggedIn } = await apiLogin(dto)
    setUser(loggedIn)
    setSetupComplete(true)
  }

  const logout = async () => {
    await apiLogout()
    setUser(null)
  }

  const setup = async (dto: SetupDto) => {
    const { user: created } = await apiSetup(dto)
    setUser(created)
    setSetupComplete(true)
  }

  if (loading) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    )
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        setupComplete,
        loading,
        login,
        logout,
        setup,
        refreshStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
