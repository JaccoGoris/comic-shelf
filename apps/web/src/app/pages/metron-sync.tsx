import { useEffect, useState } from 'react'
import {
  startMetronSync,
  stopMetronSync,
  getMetronSyncStatus,
} from '../../api/client'
import type { MetronSyncStatusDto } from '@comic-shelf/shared-types'
import {
  Container,
  Title,
  Text,
  Group,
  Stack,
  Progress,
  Badge,
  Alert,
} from '@mantine/core'
import {
  IconRefresh,
  IconPlayerStop,
  IconAlertCircle,
} from '@tabler/icons-react'
import { getErrorMessage } from '../../utils/error'
import { SYNC_POLL_INTERVAL_MS } from '../../utils/constants'
import { CSButton } from '../components/cs-button'

export function MetronSyncPage() {
  const [syncStatus, setSyncStatus] = useState<MetronSyncStatusDto | null>(null)
  const [syncMissingLoading, setSyncMissingLoading] = useState(false)
  const [syncAllLoading, setSyncAllLoading] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [stopping, setStopping] = useState(false)

  // Initial fetch
  useEffect(() => {
    getMetronSyncStatus()
      .then(setSyncStatus)
      .catch((err) => {
        console.error('Failed to get Metron sync status', err)
      })
  }, [])

  // Polling while running
  useEffect(() => {
    if (!syncStatus?.running) {
      setStopping(false)
      return
    }
    const id = setInterval(async () => {
      try {
        const status = await getMetronSyncStatus()
        setSyncStatus(status)
        if (!status.running) {
          setStopping(false)
          clearInterval(id)
        }
      } catch {
        setStopping(false)
        clearInterval(id)
      }
    }, SYNC_POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [syncStatus?.running])

  const handleStartSync = async (force = false) => {
    const setLoading = force ? setSyncAllLoading : setSyncMissingLoading
    setLoading(true)
    setSyncError(null)
    try {
      setSyncStatus(await startMetronSync(force))
    } catch (err: unknown) {
      setSyncError(getErrorMessage(err, 'Failed to start sync'))
    } finally {
      setLoading(false)
    }
  }

  const handleStopSync = async () => {
    setStopping(true)
    try {
      setSyncStatus(await stopMetronSync())
    } catch (err: unknown) {
      setStopping(false)
      setSyncError(getErrorMessage(err, 'Failed to stop sync'))
    }
  }

  const syncProgress =
    syncStatus && syncStatus.total > 0
      ? Math.round((syncStatus.processed / syncStatus.total) * 100)
      : 0

  return (
    <Container size="md" py="md">
      <Title order={1} mb="xs">
        Metron Sync
      </Title>
      <Text c="dimmed" mb="lg">
        Enrich your library with data from Metron by matching comics via UPC
        barcode. Comics without a barcode will be skipped.
      </Text>

      {syncError && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Error"
          color="red"
          mb="md"
          withCloseButton
          onClose={() => setSyncError(null)}
        >
          {syncError}
        </Alert>
      )}

      <Group mb="lg">
        {syncStatus?.running ? (
          <CSButton
            rightSection={<IconPlayerStop size={16} />}
            variant="light"
            color="red"
            loading={stopping}
            onClick={handleStopSync}
          >
            Stop Sync
          </CSButton>
        ) : (
          <>
            <CSButton
              rightSection={<IconRefresh size={16} />}
              loading={syncMissingLoading}
              onClick={() => handleStartSync(false)}
            >
              Sync Missing
            </CSButton>
            <CSButton
              rightSection={<IconRefresh size={16} />}
              variant="light"
              loading={syncAllLoading}
              onClick={() => handleStartSync(true)}
            >
              Sync All
            </CSButton>
          </>
        )}
      </Group>

      {syncStatus && (
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm" fw={500}>
              {syncStatus.running ? 'Sync in progress…' : 'Last sync'}
            </Text>
            <Group gap="xs">
              <Badge color="green" variant="light" size="sm">
                {syncStatus.found} enriched
              </Badge>
              <Badge color="gray" variant="light" size="sm">
                {syncStatus.skipped} skipped
              </Badge>
              {syncStatus.failed > 0 && (
                <Badge color="red" variant="light" size="sm">
                  {syncStatus.failed} failed
                </Badge>
              )}
            </Group>
          </Group>
          <Progress
            value={syncProgress}
            color="violet"
            size="sm"
            animated={syncStatus.running}
          />
          <Text size="xs" c="dimmed">
            {syncStatus.processed} of {syncStatus.total} comics processed (
            {syncProgress}%)
          </Text>
          {syncStatus.startedAt && (
            <Text size="xs" c="dimmed">
              Started: {new Date(syncStatus.startedAt).toLocaleString()}
            </Text>
          )}
          {syncStatus.completedAt && (
            <Text size="xs" c="dimmed">
              Completed: {new Date(syncStatus.completedAt).toLocaleString()}
            </Text>
          )}
        </Stack>
      )}
    </Container>
  )
}
