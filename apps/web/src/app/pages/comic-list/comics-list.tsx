import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import {
  getComics,
  getPublishers,
  getSeries,
  getSettings,
  updateSettings,
  type ComicFilters,
} from '../../../api/client'
import type {
  ComicListItemDto,
  PublisherDto,
  SeriesDto,
} from '@comic-shelf/shared-types'
import {
  Container,
  Title,
  TextInput,
  Select,
  SimpleGrid,
  Text,
  Group,
  Loader,
  Center,
  Stack,
  Anchor,
  Divider,
  Button,
  Menu,
  ActionIcon,
} from '@mantine/core'
import { useDisclosure, useIntersection } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import {
  IconSearch,
  IconPlus,
  IconChevronDown,
  IconPencil,
} from '@tabler/icons-react'
import { getErrorMessage } from '../../../utils/error'
import { PAGE_SIZE } from '../../../utils/constants'
import { ComicCard } from './comic-card'
import { CreateComicModal } from '../../components/create-comic-modal'
import { MetronAddModal } from '../metron-add'

export function ComicsListPage() {
  const navigate = useNavigate()
  const [createModalOpened, { open: openCreateModal, close: closeCreateModal }] = useDisclosure(false)
  const [metronModalOpened, { open: openMetronModal, close: closeMetronModal }] = useDisclosure(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const [comics, setComics] = useState<ComicListItemDto[]>([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [publishers, setPublishers] = useState<PublisherDto[]>([])
  const [series, setSeries] = useState<SeriesDto[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [collectionName, setCollectionName] = useState('Comic Collection')
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState('')
  const [searchInput, setSearchInput] = useState(
    searchParams.get('search') ?? '',
  )

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
    getSettings()
      .then((s) => setCollectionName(s.collectionName))
      .catch((err) => {
        console.error('Failed to get settings', err)
      })
  }, [])

  const handleTitleEdit = () => {
    setTitleInput(collectionName)
    setEditingTitle(true)
  }

  const handleTitleSave = async () => {
    const newName = titleInput.trim()
    if (newName && newName !== collectionName) {
      try {
        const result = await updateSettings({ collectionName: newName })
        setCollectionName(result.collectionName)
      } catch {
        notifications.show({
          title: 'Error',
          message: 'Failed to update collection name.',
          color: 'red',
        })
      }
    }
    setEditingTitle(false)
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleTitleSave()
    if (e.key === 'Escape') setEditingTitle(false)
  }

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
        {editingTitle ? (
          <TextInput
            value={titleInput}
            onChange={(e) => setTitleInput(e.currentTarget.value)}
            onBlur={handleTitleSave}
            onKeyDown={handleTitleKeyDown}
            size="xl"
            styles={{ input: { fontWeight: 700, fontSize: 'var(--mantine-h1-font-size)' } }}
            data-autofocus
            autoFocus
            w={400}
          />
        ) : (
          <Group
            gap="xs"
            onClick={handleTitleEdit}
            style={{ cursor: 'pointer' }}
          >
            <Title order={1}>{collectionName}</Title>
            <IconPencil size={18} style={{ opacity: 0.4 }} />
          </Group>
        )}
        <Group>
          <Button.Group>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={openCreateModal}
            >
              Create Comic
            </Button>
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <ActionIcon variant="filled" size={36} color="violet">
                  <IconChevronDown size={16} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconSearch size={14} />}
                  onClick={openMetronModal}
                >
                  Add from Metron
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Button.Group>
        </Group>
      </Group>

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
            <Anchor component={Link} to="/settings?tab=data">
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

      <CreateComicModal
        opened={createModalOpened}
        onClose={closeCreateModal}
        onCreated={(comicId) => navigate(`/comics/${comicId}`)}
      />
      <MetronAddModal
        opened={metronModalOpened}
        onClose={closeMetronModal}
        onImported={(comicId) => navigate(`/comics/${comicId}`)}
      />
    </Container>
  )
}
