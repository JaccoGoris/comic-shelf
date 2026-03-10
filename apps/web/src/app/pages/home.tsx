import { Link } from 'react-router-dom'
import { Container, Title, Text, Button, Stack, Group } from '@mantine/core'
import { IconBooks } from '@tabler/icons-react'

export function HomePage() {
  return (
    <Container size="sm" py="xl">
      <Stack align="center" gap="lg" ta="center">
        <Title order={1}>Welcome to Comic Shelf</Title>
        <Text size="lg" c="dimmed">
          Your personal comic book collection manager.
        </Text>
        <Group mt="md">
          <Button
            component={Link}
            to="/comics"
            size="lg"
            leftSection={<IconBooks size={20} />}
          >
            Browse Collection
          </Button>
        </Group>
      </Stack>
    </Container>
  )
}
