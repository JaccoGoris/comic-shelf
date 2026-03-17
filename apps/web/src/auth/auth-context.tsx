import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react'
import { Alert, Button, Center, Loader, Stack, Text } from '@mantine/core'
import { IconRefresh, IconWifiOff } from '@tabler/icons-react'
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
  oidcEnabled: boolean
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
  const [oidcEnabled, setOidcEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState(false)

  const refreshStatus = useCallback(async () => {
    try {
      const status = await getAuthStatus()
      setSetupComplete(status.setupComplete)
      setOidcEnabled(status.oidcEnabled)
      setUser(status.user)
      setApiError(false)
    } catch {
      setUser(null)
      setApiError(true)
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

  if (apiError) {
    return (
      <Center h="100vh">
        <Stack align="center" gap="md" maw={400}>
          <Alert
            icon={<IconWifiOff size={18} />}
            title="Cannot reach the server"
            color="red"
            w="100%"
          >
            <Text size="sm">
              The API is unavailable. Make sure the backend is running and try again.
            </Text>
          </Alert>
          <Button
            leftSection={<IconRefresh size={16} />}
            onClick={() => {
              setLoading(true)
              setApiError(false)
              refreshStatus().finally(() => setLoading(false))
            }}
          >
            Retry
          </Button>
        </Stack>
      </Center>
    )
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        setupComplete,
        oidcEnabled,
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
