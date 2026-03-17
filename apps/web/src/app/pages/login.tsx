import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Center,
  Paper,
  Title,
  TextInput,
  PasswordInput,
  Stack,
  Text,
  Alert,
  Divider,
  Button,
} from '@mantine/core'
import { IconAlertCircle, IconLogin } from '@tabler/icons-react'
import { useAuth } from '../../auth/auth-context'
import { CSButton } from '../components/cs-button'

export function LoginPage() {
  const { login, oidcEnabled } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const oidcError = searchParams.get('error') === 'oidc_no_user'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login({ username, password })
      navigate('/')
    } catch {
      setError('Invalid username or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Center h="100vh">
      <Paper withBorder shadow="md" p="xl" w={360}>
        <Stack gap="md">
          <Stack gap={4}>
            <Title order={2}>Comic Shelf</Title>
            <Text c="dimmed" size="sm">
              Sign in to your account
            </Text>
          </Stack>
          {oidcError && (
            <Alert icon={<IconAlertCircle size={16} />} color="orange">
              No matching account found. Ask an admin to create your account
              first.
            </Alert>
          )}
          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red">
              {error}
            </Alert>
          )}
          <form onSubmit={handleSubmit}>
            <Stack gap="sm">
              <TextInput
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.currentTarget.value)}
                required
                autoFocus
              />
              <PasswordInput
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                required
              />
              <CSButton type="submit" loading={loading} fullWidth mt="xs">
                Sign in
              </CSButton>
            </Stack>
          </form>
          {oidcEnabled && (
            <>
              <Divider label="or" labelPosition="center" />
              <Button
                component="a"
                href="/api/auth/oidc"
                variant="default"
                fullWidth
                leftSection={<IconLogin size={16} />}
              >
                Sign in with OIDC
              </Button>
            </>
          )}
        </Stack>
      </Paper>
    </Center>
  )
}
