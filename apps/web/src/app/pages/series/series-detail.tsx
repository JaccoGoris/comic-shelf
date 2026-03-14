import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import {
  Box,
  Flex,
  Title,
  Group,
  Badge,
  Text,
  Button,
  SimpleGrid,
  Stack,
  Progress,
  Center,
  Skeleton,
  Alert,
  Container,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconArrowLeft, IconAlertCircle } from '@tabler/icons-react'
import type { SeriesIssueDto } from '@comic-shelf/shared-types'
import {
  getTrackedSeriesIssues,
  getTrackedSeries,
  updateComic,
  syncSingleComic,
} from '../../../api/client'
import type { TrackedSeriesDto } from '@comic-shelf/shared-types'
import { ComicCard } from '../comic-list/comic-card'
import { ComicDetailPanel } from '../comic-list/components/comic-detail-panel'

export function SeriesDetailPage() {
  const { metronSeriesId: metronSeriesIdParam } = useParams<{
    metronSeriesId: string
  }>()
  const metronSeriesId = parseInt(metronSeriesIdParam ?? '0', 10)

  const [issues, setIssues] = useState<SeriesIssueDto[]>([])
  const [trackedSeries, setTrackedSeries] = useState<TrackedSeriesDto | null>(
    null
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [acquiringIds, setAcquiringIds] = useState<Set<number>>(new Set())
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedComicId = searchParams.get('comic')

  const selectComic = useCallback(
    (id: number | null) => {
      const params = new URLSearchParams(searchParams)
      if (id !== null) {
        params.set('comic', String(id))
      } else {
        params.delete('comic')
      }
      setSearchParams(params)
    },
    [searchParams, setSearchParams]
  )

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [issuesData, allTracked] = await Promise.all([
        getTrackedSeriesIssues(metronSeriesId),
        getTrackedSeries(),
      ])
      setIssues(issuesData)
      const found = allTracked.find(
        (ts) => ts.metronSeriesId === metronSeriesId
      )
      setTrackedSeries(found ?? null)
    } catch {
      setError('Failed to load series issues.')
    } finally {
      setLoading(false)
    }
  }, [metronSeriesId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleAcquire = async (comicId: number) => {
    setAcquiringIds((prev) => new Set(prev).add(comicId))
    try {
      await updateComic(comicId, { collectionWishlist: 'COLLECTION' })
      await syncSingleComic(comicId)
      notifications.show({
        title: 'Issue Acquired',
        message: 'Issue added to your collection and synced with Metron.',
        color: 'green',
      })
      await loadData()
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Failed to acquire issue.',
        color: 'red',
      })
    } finally {
      setAcquiringIds((prev) => {
        const next = new Set(prev)
        next.delete(comicId)
        return next
      })
    }
  }

  const ownedCount = issues.filter(
    (i) => i.collectionType === 'COLLECTION'
  ).length
  const totalCount = issues.length
  const progressValue = totalCount > 0 ? (ownedCount / totalCount) * 100 : 0

  const seriesTitle =
    trackedSeries?.name ??
    (metronSeriesId > 0 ? `Series #${metronSeriesId}` : 'Series')

  const headerSection = (
    <>
      <Group mb="xs">
        <Button
          component={Link}
          to="/series"
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          size="sm"
        >
          Back to Series
        </Button>
      </Group>

      {!loading && !error && (
        <>
          <Group mb="sm" align="center" wrap="wrap" gap="sm">
            <Title order={2}>{seriesTitle}</Title>
            {trackedSeries?.publisher && (
              <Badge variant="light" color="violet">
                {trackedSeries.publisher}
              </Badge>
            )}
            {trackedSeries?.yearBegan && (
              <Badge variant="light" color="gray">
                {trackedSeries.yearBegan}
              </Badge>
            )}
          </Group>

          <Group mb="xs" gap="xs">
            <Text size="sm" c="dimmed">
              {ownedCount} of {totalCount} owned
            </Text>
          </Group>
          <Progress
            value={progressValue}
            color="violet"
            size="sm"
            radius="xl"
            mb="sm"
          />
        </>
      )}
    </>
  )

  const gridSection = loading ? (
    <Stack gap="md">
      <Skeleton height={40} w={300} />
      <Skeleton height={16} />
      <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 4, lg: 6 }} spacing="md">
        {Array.from({ length: 24 }).map((_, i) => (
          <Skeleton key={i} height={200} radius="md" />
        ))}
      </SimpleGrid>
    </Stack>
  ) : error ? (
    <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
      {error}
    </Alert>
  ) : issues.length === 0 ? (
    <Center py="xl">
      <Text c="dimmed">No issues found for this series.</Text>
    </Center>
  ) : (
    <SimpleGrid
      cols={
        selectedComicId
          ? { base: 1, xs: 2, sm: 2, md: 3, lg: 4 }
          : { base: 1, xs: 2, sm: 3, md: 4, lg: 6 }
      }
      spacing="md"
    >
      {issues.map((issue) => (
        <ComicCard
          key={issue.id}
          comic={issue}
          onAcquire={
            issue.collectionType === 'MISSING' ? handleAcquire : undefined
          }
          acquiring={acquiringIds.has(issue.id)}
          onSelect={selectComic}
          selected={issue.id === Number(selectedComicId)}
        />
      ))}
    </SimpleGrid>
  )

  return selectedComicId ? (
    <Flex style={{ height: 'calc(100dvh - var(--app-shell-header-height) - var(--app-shell-padding) * 2)', overflow: 'hidden' }}>
      <Box style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Container size="xl" pt="md" pb="sm" style={{ flexShrink: 0 }}>
          {headerSection}
        </Container>
        <Box style={{ flex: 1, overflowY: 'auto' }}>
          <Container size="xl">
            {gridSection}
          </Container>
        </Box>
      </Box>
      <ComicDetailPanel
        comicId={selectedComicId}
        onClose={() => selectComic(null)}
      />
    </Flex>
  ) : (
    <Container size="xl" pt="md">
      {headerSection}
      {gridSection}
    </Container>
  )
}
