import { Link } from 'react-router-dom'
import {
  Card,
  Group,
  Text,
  Badge,
  ActionIcon,
  RingProgress,
  Stack,
  Button,
} from '@mantine/core'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { IconTrash, IconExternalLink } from '@tabler/icons-react'
import type { TrackedSeriesDto } from '@comic-shelf/shared-types'
import { deleteTrackedSeries } from '../../../api/client'

interface TrackedSeriesCardProps {
  series: TrackedSeriesDto
  onUntracked: () => void
}

export function TrackedSeriesCard({
  series,
  onUntracked,
}: TrackedSeriesCardProps) {
  const total = series.ownedCount + series.missingCount
  const percentage =
    total > 0 ? Math.round((series.ownedCount / total) * 100) : 0

  const handleUntrack = () => {
    modals.openConfirmModal({
      title: 'Untrack Series',
      children: (
        <Text size="sm">
          Are you sure you want to untrack <strong>{series.name}</strong>?
          Missing issues will remain in your database.
        </Text>
      ),
      labels: { confirm: 'Untrack', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await deleteTrackedSeries(series.id)
          notifications.show({
            message: `"${series.name}" has been untracked.`,
            color: 'blue',
          })
          onUntracked()
        } catch {
          notifications.show({
            title: 'Error',
            message: 'Failed to untrack series.',
            color: 'red',
          })
        }
      },
    })
  }

  return (
    <Card withBorder radius="md" p="md">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
          <Text fw={700} lineClamp={2} size="sm">
            {series.name}
            {series.volume != null ? ` (Vol. ${series.volume})` : ''}
          </Text>
          <Group gap="xs" wrap="wrap">
            {series.publisher && (
              <Badge variant="light" color="violet" size="xs">
                {series.publisher}
              </Badge>
            )}
            {series.yearBegan && (
              <Badge variant="light" color="gray" size="xs">
                {series.yearBegan}
              </Badge>
            )}
          </Group>
          <Text size="xs" c="dimmed">
            {series.ownedCount} / {total} owned
          </Text>
        </Stack>

        <RingProgress
          size={64}
          thickness={6}
          sections={[{ value: percentage, color: 'violet' }]}
          label={
            <Text ta="center" size="xs" fw={700}>
              {percentage}%
            </Text>
          }
        />
      </Group>

      <Group mt="sm" justify="space-between">
        <Button
          component={Link}
          to={`/series/${series.metronSeriesId}`}
          variant="light"
          size="xs"
          leftSection={<IconExternalLink size={14} />}
        >
          View Issues
        </Button>
        <ActionIcon
          variant="subtle"
          color="red"
          size="sm"
          onClick={handleUntrack}
          aria-label="Untrack series"
        >
          <IconTrash size={14} />
        </ActionIcon>
      </Group>
    </Card>
  )
}
