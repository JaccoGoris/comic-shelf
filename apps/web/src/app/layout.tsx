import { useState, useEffect, useRef } from 'react'
import { Link, Outlet, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import {
  AppShell,
  Group,
  Text,
  TextInput,
  ActionIcon,
  Burger,
  NavLink,
  Menu,
  Divider,
  useMantineColorScheme,
  useComputedColorScheme,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import {
  IconSun,
  IconMoon,
  IconDeviceDesktop,
  IconSearch,
  IconDashboard,
  IconBooks,
  IconSettings,
  IconUser,
  IconLogout,
  IconRefresh,
  IconLayersLinked,
  IconLayoutSidebar,
} from '@tabler/icons-react'
import { useAuth } from '../auth/auth-context'

export function Layout() {
  const [opened, { toggle, close }] = useDisclosure()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const prevHasPanelRef = useRef(false)
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')

  useEffect(() => {
    const hasPanel = !!searchParams.get('comic')
    if (hasPanel && !prevHasPanelRef.current) {
      setSidebarOpen(false)
    } else if (!hasPanel && prevHasPanelRef.current) {
      setSidebarOpen(true)
    }
    prevHasPanelRef.current = hasPanel
  }, [searchParams])
  const { setColorScheme, colorScheme } = useMantineColorScheme()
  const computedColorScheme = useComputedColorScheme('light')
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const colorSchemeIcon =
    colorScheme === 'auto' ? (
      <IconDeviceDesktop size={18} />
    ) : computedColorScheme === 'light' ? (
      <IconSun size={18} />
    ) : (
      <IconMoon size={18} />
    )

  const handleLogout = async () => {
    await logout()
    notifications.show({ message: 'Logged out', color: 'blue' })
    navigate('/login')
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && search.trim()) {
      navigate(`/comics?search=${encodeURIComponent(search.trim())}`)
      setSearch('')
    }
  }

  const navItems = [{ label: 'Dashboard', icon: IconDashboard, to: '/' }]

  const collectionItems = [
    { label: 'Browse', icon: IconBooks, to: '/comics' },
    { label: 'Series', icon: IconLayersLinked, to: '/series' },
    { label: 'Sync', icon: IconRefresh, to: '/sync' },
  ]

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 250,
        breakpoint: 'sm',
        collapsed: { mobile: !opened, desktop: !sidebarOpen },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
            />
            <ActionIcon
              variant="subtle"
              size="lg"
              visibleFrom="sm"
              onClick={() => setSidebarOpen((o) => !o)}
              aria-label="Toggle sidebar"
            >
              <IconLayoutSidebar size={18} />
            </ActionIcon>
            <Text
              component={Link}
              to="/"
              fw={700}
              size="xl"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              Comic Shelf
            </Text>
          </Group>

          <TextInput
            placeholder="Search comics..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            onKeyDown={handleSearchKeyDown}
            visibleFrom="sm"
            w={300}
          />

          <Group gap="sm">
            <Text
              component="a"
              href="https://github.com/JaccoGoris/comic-shelf/releases"
              target="_blank"
              rel="noopener noreferrer"
              size="xs"
              c="dimmed"
              visibleFrom="sm"
              style={{ textDecoration: 'none' }}
            >
              v{__APP_VERSION__}
            </Text>
            <Menu shadow="md" width={160}>
              <Menu.Target>
                <ActionIcon
                  variant="default"
                  size="lg"
                  aria-label="Color scheme"
                >
                  {colorSchemeIcon}
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconSun size={14} />}
                  onClick={() => setColorScheme('light')}
                  fw={colorScheme === 'light' ? 700 : undefined}
                >
                  Light
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconMoon size={14} />}
                  onClick={() => setColorScheme('dark')}
                  fw={colorScheme === 'dark' ? 700 : undefined}
                >
                  Dark
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconDeviceDesktop size={14} />}
                  onClick={() => setColorScheme('auto')}
                  fw={colorScheme === 'auto' ? 700 : undefined}
                >
                  System
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <ActionIcon variant="default" size="lg" aria-label="User menu">
                  <IconUser size={18} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>{user?.username}</Menu.Label>
                <Menu.Item leftSection={<IconUser size={14} />} disabled>
                  Profile
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  color="red"
                  leftSection={<IconLogout size={14} />}
                  onClick={handleLogout}
                >
                  Logout
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            component={Link}
            to={item.to}
            label={item.label}
            leftSection={<item.icon size={18} />}
            active={location.pathname === item.to}
            onClick={close}
          />
        ))}

        <Divider my="sm" />
        <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb={4} ml="sm">
          Collection
        </Text>
        {collectionItems.map((item) => (
          <NavLink
            key={item.to}
            component={Link}
            to={item.to}
            label={item.label}
            leftSection={<item.icon size={18} />}
            active={
              location.pathname === item.to ||
              (item.to === '/comics' &&
                location.pathname.startsWith('/comics/')) ||
              (item.to === '/series' &&
                location.pathname.startsWith('/series/'))
            }
            onClick={close}
          />
        ))}

        <Divider my="sm" />
        <NavLink
          component={Link}
          to="/settings"
          label="Settings"
          leftSection={<IconSettings size={18} />}
          active={location.pathname === '/settings'}
          onClick={close}
        />
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  )
}
