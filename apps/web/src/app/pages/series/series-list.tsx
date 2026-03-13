import { useEffect, useState } from 'react'
import {
  Title,
  Group,
  SimpleGrid,
  Text,
  Center,
  Skeleton,
  Stack,
  Alert,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import {
  IconPlus,
  IconLayersLinked,
  IconAlertCircle,
} from '@tabler/icons-react'
import type { TrackedSeriesDto } from '@comic-shelf/shared-types'
import { getTrackedSeries } from '../../../api/client'
import { TrackedSeriesCard } from './tracked-series-card'
import { AddSeriesModal } from './add-series-modal'
import { CSButton } from '../../components/cs-button'

export function SeriesListPage() {
  const [series, setSeries] = useState<TrackedSeriesDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getTrackedSeries()
      setSeries(data)
    } catch {
      setError('Failed to load tracked series.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <>
      <Group justify="space-between" mb="lg" align="center">
        <Group gap="sm">
          <IconLayersLinked size={28} />
          <Title order={2}>Series Tracker</Title>
        </Group>
        <CSButton rightSection={<IconPlus size={16} />} onClick={openModal}>
          Track Series
        </CSButton>
      </Group>

      {error && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Error"
          color="red"
          mb="md"
        >
          {error}
        </Alert>
      )}

      {loading ? (
        <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 4 }} spacing="md">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} height={160} radius="md" />
          ))}
        </SimpleGrid>
      ) : series.length === 0 ? (
        <Center py="xl">
          <Stack align="center" gap="sm">
            <IconLayersLinked size={48} opacity={0.3} />
            <Text c="dimmed" ta="center">
              No series tracked yet.
              <br />
              Click "Track Series" to start following a comic series.
            </Text>
          </Stack>
        </Center>
      ) : (
        <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 4 }} spacing="md">
          {series.map((s) => (
            <TrackedSeriesCard key={s.id} series={s} onUntracked={load} />
          ))}
        </SimpleGrid>
      )}

      <AddSeriesModal
        opened={modalOpened}
        onClose={closeModal}
        onTracked={load}
      />
    </>
  )
}
