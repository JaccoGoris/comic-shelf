import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import {
  Title,
  Group,
  Badge,
  Text,
  Button,
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
import { ComicGrid } from '../../components/comic-grid'

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
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev)
        if (id !== null) {
          params.set('comic', String(id))
        } else {
          params.delete('comic')
        }
        return params
      })
    },
    [setSearchParams]
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
          <ComicGrid.Toolbar />
        </>
      )}
    </>
  )

  const gridSection = (
    <Stack style={{ flex: 1, overflowY: 'auto', minHeight: 0 }} gap="md">
      {loading ? (
        <ComicGrid.Section>
          {Array.from({ length: 24 }).map((_, i) => (
            <Skeleton key={i} height={200} radius="md" />
          ))}
        </ComicGrid.Section>
      ) : error ? (
        <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
          {error}
        </Alert>
      ) : issues.length === 0 ? (
        <Center py="xl">
          <Text c="dimmed">No issues found for this series.</Text>
        </Center>
      ) : (
        <ComicGrid.Section>
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
        </ComicGrid.Section>
      )}
    </Stack>
  )

  return (
    <Group wrap="nowrap">
      <Container
        size="xl"
        h="calc(100dvh - var(--app-shell-header-offset, 0px))"
        py="md"
        display="flex"
        style={{ flexDirection: 'column', flex: 1, minWidth: 0 }}
      >
        {headerSection}
        {gridSection}
      </Container>
      {selectedComicId && (
        <ComicDetailPanel
          comicId={selectedComicId}
          onClose={() => selectComic(null)}
        />
      )}
    </Group>
  )
}
