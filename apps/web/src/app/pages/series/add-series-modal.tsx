import { useState, useEffect } from 'react'
import { useIsMobile } from '../../hooks/use-is-mobile'
import {
  Modal,
  TextInput,
  Button,
  Stack,
  Text,
  Badge,
  Group,
  Loader,
  Center,
  Alert,
  Paper,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  IconSearch,
  IconArrowLeft,
  IconPlus,
  IconAlertCircle,
} from '@tabler/icons-react'
import type { MetronSeriesSearchResultDto } from '@comic-shelf/shared-types'
import { searchMetronSeries, createTrackedSeries } from '../../../api/client'
import { CSButton } from '../../components/cs-button'

function getApiError(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ?? fallback
  )
}

type Step = 'search' | 'results'

interface AddSeriesModalProps {
  opened: boolean
  onClose: () => void
  onTracked: () => void
  initialSeriesName?: string
}

export function AddSeriesModal({
  opened,
  onClose,
  onTracked,
  initialSeriesName,
}: AddSeriesModalProps) {
  const isMobile = useIsMobile()
  const [step, setStep] = useState<Step>('search')
  const [seriesName, setSeriesName] = useState('')

  useEffect(() => {
    if (opened && initialSeriesName) {
      setSeriesName(initialSeriesName)
    }
  }, [opened, initialSeriesName])
  const [publisherName, setPublisherName] = useState('')
  const [loading, setLoading] = useState(false)
  const [trackingId, setTrackingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<MetronSeriesSearchResultDto[]>([])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!seriesName.trim()) return

    setLoading(true)
    setError(null)
    try {
      const params: { name: string; publisher_name?: string } = {
        name: seriesName.trim(),
      }
      if (publisherName.trim()) {
        params.publisher_name = publisherName.trim()
      }
      const data = await searchMetronSeries(params)
      setResults(data)
      if (data.length === 0) {
        setError('No series found. Try a different name or publisher.')
      } else {
        setStep('results')
      }
    } catch (err) {
      setError(getApiError(err, 'Failed to search Metron API.'))
    } finally {
      setLoading(false)
    }
  }

  const handleTrack = async (series: MetronSeriesSearchResultDto) => {
    setTrackingId(series.id)
    setError(null)
    try {
      await createTrackedSeries({
        metronSeriesId: series.id,
        name: series.name,
        volume: series.volume,
        yearBegan: series.yearBegan,
        issueCount: series.issueCount,
      })
      notifications.show({
        title: 'Series Tracked',
        message: `"${series.name}" is now being tracked. Missing issues have been added.`,
        color: 'green',
      })
      handleClose()
      onTracked()
    } catch (err) {
      setError(getApiError(err, 'Failed to track series.'))
    } finally {
      setTrackingId(null)
    }
  }

  const handleBack = () => {
    setError(null)
    setResults([])
    setStep('search')
  }

  const handleClose = () => {
    setStep('search')
    setResults([])
    setError(null)
    setSeriesName('')
    setPublisherName('')
    onClose()
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Track a Series"
      size="lg"
      fullScreen={isMobile}
      centered
    >
      {error && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Error"
          color="red"
          mb="md"
          withCloseButton
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {step === 'search' && (
        <>
          <Text size="sm" c="dimmed" mb="md">
            Search for a series on Metron to track missing issues.
          </Text>
          <form onSubmit={handleSearch}>
            <Stack gap="sm">
              <TextInput
                label="Series Name"
                placeholder="e.g. Amazing Spider-Man"
                value={seriesName}
                onChange={(e) => setSeriesName(e.currentTarget.value)}
                leftSection={<IconSearch size={16} />}
                required
              />
              <TextInput
                label="Publisher (optional)"
                placeholder="e.g. Marvel"
                value={publisherName}
                onChange={(e) => setPublisherName(e.currentTarget.value)}
              />
              <CSButton
                type="submit"
                loading={loading}
                leftSection={<IconSearch size={16} />}
              >
                Search
              </CSButton>
            </Stack>
          </form>
        </>
      )}

      {step === 'results' && (
        <>
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            onClick={handleBack}
            mb="md"
          >
            Back to search
          </Button>

          {loading ? (
            <Center py="xl">
              <Loader size="lg" />
            </Center>
          ) : (
            <Stack gap="sm">
              {results.map((series) => (
                <Paper key={series.id} withBorder p="md" radius="md">
                  <Group justify="space-between" wrap="wrap" gap="xs">
                    <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                      <Text fw={600} size="sm">
                        {series.name}
                        {series.volume ? ` (Vol. ${series.volume})` : ''}
                      </Text>
                      <Group gap="xs" wrap="wrap">
                        <Badge variant="light" color="gray" size="xs">
                          {series.yearBegan}
                        </Badge>
                        <Badge variant="light" color="blue" size="xs">
                          {series.issueCount} issues
                        </Badge>
                      </Group>
                    </Stack>
                    <Button
                      size="xs"
                      leftSection={<IconPlus size={14} />}
                      loading={trackingId === series.id}
                      disabled={trackingId !== null && trackingId !== series.id}
                      onClick={() => handleTrack(series)}
                    >
                      Track
                    </Button>
                  </Group>
                </Paper>
              ))}
            </Stack>
          )}
        </>
      )}
    </Modal>
  )
}
