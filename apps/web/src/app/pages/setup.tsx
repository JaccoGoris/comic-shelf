import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Center,
  Paper,
  Title,
  TextInput,
  PasswordInput,
  Stack,
  Text,
  Alert,
} from '@mantine/core'
import { IconAlertCircle } from '@tabler/icons-react'
import { useAuth } from '../../auth/auth-context'
import { CSButton } from '../components/cs-button'

export function SetupPage() {
  const { setup } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setError(null)
    setLoading(true)
    try {
      await setup({ username, password })
      navigate('/')
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Setup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Center h="100vh">
      <Paper withBorder shadow="md" p="xl" w={380}>
        <Stack gap="md">
          <Stack gap={4}>
            <Title order={2}>Welcome to Comic Shelf</Title>
            <Text c="dimmed" size="sm">
              Create your admin account to get started
            </Text>
          </Stack>
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
              <PasswordInput
                label="Confirm Password"
                value={confirm}
                onChange={(e) => setConfirm(e.currentTarget.value)}
                required
              />
              <CSButton type="submit" loading={loading} fullWidth mt="xs">
                Create Admin Account
              </CSButton>
            </Stack>
          </form>
        </Stack>
      </Paper>
    </Center>
  )
}
