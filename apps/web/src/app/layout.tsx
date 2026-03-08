import { Link, Outlet, useNavigate } from 'react-router-dom'
import {
  AppShell,
  Group,
  Text,
  Button,
  ActionIcon,
  useMantineColorScheme,
  useComputedColorScheme,
  Tooltip,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  IconSun,
  IconMoon,
  IconPlus,
  IconUsers,
  IconLogout,
} from '@tabler/icons-react'
import { useAuth } from '../auth/auth-context'

export function Layout() {
  const { setColorScheme } = useMantineColorScheme()
  const computedColorScheme = useComputedColorScheme('light')
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const toggleColorScheme = () => {
    setColorScheme(computedColorScheme === 'light' ? 'dark' : 'light')
  }

  const handleLogout = async () => {
    await logout()
    notifications.show({ message: 'Logged out', color: 'blue' })
    navigate('/login')
  }

  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Text
            component={Link}
            to="/"
            fw={700}
            size="xl"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            Comic Shelf
          </Text>
          <Group gap="sm">
            <Button variant="subtle" component={Link} to="/comics">
              Collection
            </Button>
            <Button
              variant="subtle"
              component={Link}
              to="/add"
              leftSection={<IconPlus size={16} />}
            >
              Add Comic
            </Button>
            <Button variant="subtle" component={Link} to="/import">
              Import
            </Button>
            {user?.role === 'ADMIN' && (
              <Button
                variant="subtle"
                component={Link}
                to="/users"
                leftSection={<IconUsers size={16} />}
              >
                Users
              </Button>
            )}
            <ActionIcon
              variant="default"
              size="lg"
              onClick={toggleColorScheme}
              aria-label="Toggle color scheme"
            >
              {computedColorScheme === 'light' ? (
                <IconMoon size={18} />
              ) : (
                <IconSun size={18} />
              )}
            </ActionIcon>
            <Tooltip label={`Logout (${user?.username})`}>
              <ActionIcon
                variant="default"
                size="lg"
                onClick={handleLogout}
                aria-label="Logout"
              >
                <IconLogout size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  )
}
