import { Link, Outlet } from 'react-router-dom';
import {
  AppShell,
  Group,
  Text,
  Button,
  ActionIcon,
  useMantineColorScheme,
  useComputedColorScheme,
} from '@mantine/core';
import { IconSun, IconMoon, IconPlus } from '@tabler/icons-react';

export function Layout() {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light');

  const toggleColorScheme = () => {
    setColorScheme(computedColorScheme === 'light' ? 'dark' : 'light');
  };

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
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
