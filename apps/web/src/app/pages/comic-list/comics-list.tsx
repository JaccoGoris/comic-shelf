import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  getComics,
  getPublishers,
  getSeries,
  startMetronSync,
  stopMetronSync,
  getMetronSyncStatus,
  type ComicFilters,
} from '../../../api/client'
import type {
  ComicListItemDto,
  PublisherDto,
  SeriesDto,
  MetronSyncStatusDto,
} from '@comic-shelf/shared-types'
import {
  Container,
  Title,
  TextInput,
  Select,
  SimpleGrid,
  Text,
  Badge,
  Group,
  Loader,
  Center,
  Stack,
  Anchor,
  Divider,
  Button,
  Progress,
  Notification,
  Tooltip,
} from '@mantine/core'
import { useIntersection } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import {
  IconSearch,
  IconPlus,
  IconRefresh,
  IconPlayerStop,
} from '@tabler/icons-react'
import { getErrorMessage } from '../../../utils/error'
import { PAGE_SIZE, SYNC_POLL_INTERVAL_MS } from '../../../utils/constants'
import { ComicCard } from './comic-card'

export function ComicsListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [comics, setComics] = useState<ComicListItemDto[]>([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [publishers, setPublishers] = useState<PublisherDto[]>([])
  const [series, setSeries] = useState<SeriesDto[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searchInput, setSearchInput] = useState(
    searchParams.get('search') ?? '',
  )
  const [syncStatus, setSyncStatus] = useState<MetronSyncStatusDto | null>(null)
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  const pageRef = useRef(1)

  const search = searchParams.get('search') ?? ''
  const publisherId = searchParams.get('publisherId') ?? ''
  const seriesId = searchParams.get('seriesId') ?? ''
  const read = searchParams.get('read') ?? ''
  const groupBy = searchParams.get('groupBy') ?? 'series'

  const { ref: sentinelRef, entry } = useIntersection({ threshold: 0.1 })

  const buildFilters = useCallback(
    (page: number): ComicFilters => {
      const filters: ComicFilters = { page, limit: PAGE_SIZE }
      if (search) filters.search = search
      if (publisherId) filters.publisherId = parseInt(publisherId, 10)
      if (seriesId) filters.seriesId = parseInt(seriesId, 10)
      if (read) filters.read = read === 'true'
      return filters
    },
    [search, publisherId, seriesId, read],
  )

  const fetchComics = useCallback(async () => {
    setLoading(true)
    pageRef.current = 1
    try {
      const filters = buildFilters(1)
      const data = await getComics(filters)
      setComics(data.data)
      setTotal(data.total)
      setHasMore(data.page < data.totalPages)
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: getErrorMessage(
          err,
          'Failed to load comics. Please try again.',
        ),
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }, [buildFilters])

  const fetchMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const nextPage = pageRef.current + 1
    try {
      const filters = buildFilters(nextPage)
      const data = await getComics(filters)
      pageRef.current = nextPage
      setComics((prev) => [...prev, ...data.data])
      setHasMore(data.page < data.totalPages)
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: getErrorMessage(err, 'Failed to load more comics.'),
        color: 'red',
      })
    } finally {
      setLoadingMore(false)
    }
  }, [buildFilters, loadingMore, hasMore])

  // Initial fetch and refetch on filter changes
  useEffect(() => {
    fetchComics()
  }, [fetchComics])

  // Infinite scroll trigger
  useEffect(() => {
    if (entry?.isIntersecting && hasMore && !loading && !loadingMore) {
      fetchMore()
    }
  }, [entry?.isIntersecting, hasMore, loading, loadingMore, fetchMore])

  // Load filter options
  useEffect(() => {
    getPublishers()
      .then(setPublishers)
      .catch((err) => {
        console.error('Failed to get publishers', err)
      })
    getSeries()
      .then(setSeries)
      .catch((err) => {
        console.error('Failed to get series', err)
      })
    getMetronSyncStatus()
      .then(setSyncStatus)
      .catch((err) => {
        console.error('Failed to get Metron sync status', err)
      })
  }, [])

  // Sync polling
  useEffect(() => {
    if (!syncStatus?.running) return
    const id = setInterval(async () => {
      try {
        const status = await getMetronSyncStatus()
        setSyncStatus(status)
        if (!status.running) {
          clearInterval(id)
          fetchComics()
        }
      } catch {
        clearInterval(id)
      }
    }, SYNC_POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [syncStatus?.running, fetchComics])

  const handleStartSync = async () => {
    setSyncLoading(true)
    setSyncError(null)
    try {
      setSyncStatus(await startMetronSync())
    } catch (err: unknown) {
      setSyncError(getErrorMessage(err, 'Failed to start sync'))
    } finally {
      setSyncLoading(false)
    }
  }

  const handleStopSync = async () => {
    try {
      setSyncStatus(await stopMetronSync())
    } catch (err: unknown) {
      setSyncError(getErrorMessage(err, 'Failed to stop sync'))
    }
  }

  const syncProgress =
    syncStatus && syncStatus.total > 0
      ? Math.round((syncStatus.processed / syncStatus.total) * 100)
      : 0

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete('page')
    setSearchParams(params)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateFilter('search', searchInput)
  }

  const publisherData = publishers.map((p) => ({
    value: String(p.id),
    label: p.name,
  }))

  const seriesData = series.map((s) => ({
    value: String(s.id),
    label: s.name,
  }))

  const readData = [
    { value: 'true', label: 'Read' },
    { value: 'false', label: 'Unread' },
  ]

  const groupByData = [
    { value: 'series', label: 'Series' },
    { value: 'publisher', label: 'Publisher' },
    { value: 'none', label: 'None' },
  ]

  type VolumeGroup = { volume: string; comics: ComicListItemDto[] }
  type SeriesGroup = { series: string; volumes: VolumeGroup[] }

  const seriesGrouped = useMemo((): SeriesGroup[] | null => {
    if (groupBy !== 'series' || comics.length === 0) return null

    const needsInfo: ComicListItemDto[] = []
    const seriesMap = new Map<string, Map<string, ComicListItemDto[]>>()

    for (const comic of comics) {
      if (!comic.volume && !comic.issueNumber) {
        needsInfo.push(comic)
        continue
      }

      const seriesName = comic.series?.name ?? 'No Series'
      const volumeKey = comic.volume ? `Volume ${comic.volume}` : 'No Volume'

      let volumeMap = seriesMap.get(seriesName)
      if (!volumeMap) {
        volumeMap = new Map()
        seriesMap.set(seriesName, volumeMap)
      }
      const group = volumeMap.get(volumeKey)
      if (group) {
        group.push(comic)
      } else {
        volumeMap.set(volumeKey, [comic])
      }
    }

    const result: SeriesGroup[] = Array.from(seriesMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([seriesName, volumeMap]) => ({
        series: seriesName,
        volumes: Array.from(volumeMap.entries())
          .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
          .map(([volume, items]) => ({ volume, comics: items })),
      }))

    if (needsInfo.length > 0) {
      result.push({
        series: 'More info needed',
        volumes: [{ volume: '', comics: needsInfo }],
      })
    }

    return result
  }, [comics, groupBy])

  const flatGrouped = useMemo((): [string, ComicListItemDto[]][] | null => {
    if (groupBy !== 'publisher' || comics.length === 0) return null

    const groups = new Map<string, ComicListItemDto[]>()
    for (const comic of comics) {
      const key = comic.publisher?.name ?? 'No Publisher'
      const group = groups.get(key)
      if (group) {
        group.push(comic)
      } else {
        groups.set(key, [comic])
      }
    }

    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [comics, groupBy])

  const renderGrid = (items: ComicListItemDto[]) => (
    <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 4, lg: 6 }} spacing="md">
      {items.map((comic) => (
        <ComicCard key={comic.id} comic={comic} />
      ))}
    </SimpleGrid>
  )

  return (
    <Container size="xl" py="md">
      <Group justify="space-between" align="center" mb="lg">
        <Title order={1}>Comic Collection</Title>
        <Group>
          <Button
            component={Link}
            to="/add"
            leftSection={<IconPlus size={16} />}
          >
            Add via Metron
          </Button>
          {syncStatus?.running ? (
            <Button
              leftSection={<IconPlayerStop size={16} />}
              variant="light"
              color="red"
              onClick={handleStopSync}
            >
              Stop Sync
            </Button>
          ) : (
            <Tooltip label="Enrich library with Metron data by UPC">
              <Button
                leftSection={<IconRefresh size={16} />}
                variant="light"
                loading={syncLoading}
                onClick={handleStartSync}
              >
                Metron Sync
              </Button>
            </Tooltip>
          )}
        </Group>
      </Group>

      {/* Sync error */}
      {syncError && (
        <Notification color="red" mb="md" onClose={() => setSyncError(null)}>
          {syncError}
        </Notification>
      )}

      {/* Sync progress */}
      {syncStatus && (
        <Stack gap="xs" mb="md">
          <Group justify="space-between">
            <Text size="sm" fw={500}>
              {syncStatus.running
                ? 'Metron Sync in progress…'
                : 'Last Metron Sync'}
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
        </Stack>
      )}

      {/* Filters */}
      <Group mb="md" grow wrap="wrap" align="flex-end">
        <form onSubmit={handleSearch} style={{ flex: 2, minWidth: 200 }}>
          <TextInput
            placeholder="Search titles, synopsis, series..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.currentTarget.value)}
            leftSection={<IconSearch size={16} />}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch(e)
            }}
          />
        </form>
        <Select
          placeholder="All Publishers"
          data={publisherData}
          value={publisherId || null}
          onChange={(value) => updateFilter('publisherId', value ?? '')}
          clearable
          searchable
        />
        <Select
          placeholder="All Series"
          data={seriesData}
          value={seriesId || null}
          onChange={(value) => updateFilter('seriesId', value ?? '')}
          clearable
          searchable
        />
        <Select
          placeholder="Read & Unread"
          data={readData}
          value={read || null}
          onChange={(value) => updateFilter('read', value ?? '')}
          clearable
        />
        <Select
          placeholder="Group by"
          data={groupByData}
          value={groupBy}
          onChange={(value) => updateFilter('groupBy', value ?? 'none')}
        />
      </Group>

      {/* Stats */}
      {!loading && (
        <Text size="sm" c="dimmed" mb="md">
          {total} comics
        </Text>
      )}

      {/* Initial loading */}
      {loading && (
        <Center py="xl">
          <Loader size="lg" />
        </Center>
      )}

      {/* Series grouped view (series → volume → comics) */}
      {!loading && comics.length > 0 && seriesGrouped && (
        <Stack gap="xl">
          {seriesGrouped.map((group) => (
            <div key={group.series}>
              <Divider
                label={
                  <Text
                    fw={700}
                    size="md"
                    c={
                      group.series === 'More info needed' ? 'orange' : undefined
                    }
                  >
                    {group.series}
                  </Text>
                }
                labelPosition="left"
                mb="sm"
              />
              <Stack gap="md" ml="md">
                {group.volumes.map((vol) => (
                  <div key={vol.volume}>
                    {vol.volume && (
                      <Text size="sm" fw={500} c="dimmed" mb="xs">
                        {vol.volume} ({vol.comics.length})
                      </Text>
                    )}
                    {renderGrid(vol.comics)}
                  </div>
                ))}
              </Stack>
            </div>
          ))}
        </Stack>
      )}

      {/* Publisher grouped view */}
      {!loading && comics.length > 0 && flatGrouped && (
        <Stack gap="lg">
          {flatGrouped.map(([groupName, items]) => (
            <div key={groupName}>
              <Divider
                label={
                  <Text fw={600} size="sm">
                    {groupName} ({items.length})
                  </Text>
                }
                labelPosition="left"
                mb="sm"
              />
              {renderGrid(items)}
            </div>
          ))}
        </Stack>
      )}

      {/* Flat view */}
      {!loading &&
        comics.length > 0 &&
        !seriesGrouped &&
        !flatGrouped &&
        renderGrid(comics)}

      {/* Empty */}
      {!loading && comics.length === 0 && (
        <Center py="xl">
          <Stack align="center" gap="xs">
            <Text c="dimmed">No comics found. Try adjusting filters or</Text>
            <Anchor component={Link} to="/import">
              import your collection
            </Anchor>
          </Stack>
        </Center>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} style={{ height: 1 }} />

      {/* Loading more indicator */}
      {loadingMore && (
        <Center py="md">
          <Loader size="sm" />
        </Center>
      )}
    </Container>
  )
}
