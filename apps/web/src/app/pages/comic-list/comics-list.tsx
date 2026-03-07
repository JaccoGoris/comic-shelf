import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  getComics,
  getPublishers,
  getSeries,
  startMetronSync,
  stopMetronSync,
  getMetronSyncStatus,
  type ComicFilters,
} from '../../../api/client';
import type {
  ComicListItemDto,
  PaginatedResponse,
  PublisherDto,
  SeriesDto,
  MetronSyncStatusDto,
} from '@comic-shelf/shared-types';
import {
  Container,
  Title,
  TextInput,
  Select,
  SimpleGrid,
  Text,
  Badge,
  Group,
  Pagination,
  Loader,
  Center,
  Stack,
  Anchor,
  Divider,
  Button,
  Progress,
  Notification,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconSearch,
  IconPlus,
  IconRefresh,
  IconPlayerStop,
} from '@tabler/icons-react';
import { getErrorMessage } from '../../../utils/error';
import {
  GROUPED_FETCH_LIMIT,
  PAGE_SIZE,
  SYNC_POLL_INTERVAL_MS,
} from '../../../utils/constants';
import { ComicCard } from './comic-card';

export function ComicsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [result, setResult] =
    useState<PaginatedResponse<ComicListItemDto> | null>(null);
  const [publishers, setPublishers] = useState<PublisherDto[]>([]);
  const [series, setSeries] = useState<SeriesDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(
    searchParams.get('search') ?? ''
  );
  const [syncStatus, setSyncStatus] = useState<MetronSyncStatusDto | null>(
    null
  );
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const search = searchParams.get('search') ?? '';
  const publisherId = searchParams.get('publisherId') ?? '';
  const seriesId = searchParams.get('seriesId') ?? '';
  const read = searchParams.get('read') ?? '';
  const groupBy = searchParams.get('groupBy') ?? 'series';

  const isGrouped = groupBy !== 'none';

  const fetchComics = useCallback(async () => {
    setLoading(true);
    try {
      const filters: ComicFilters = isGrouped
        ? { page: 1, limit: GROUPED_FETCH_LIMIT }
        : { page, limit: PAGE_SIZE };
      if (search) filters.search = search;
      if (publisherId) filters.publisherId = parseInt(publisherId, 10);
      if (seriesId) filters.seriesId = parseInt(seriesId, 10);
      if (read) filters.read = read === 'true';
      const data = await getComics(filters);
      setResult(data);
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: getErrorMessage(
          err,
          'Failed to load comics. Please try again.'
        ),
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, [page, search, publisherId, seriesId, read, isGrouped]);

  useEffect(() => {
    fetchComics();
  }, [fetchComics]);

  useEffect(() => {
    getPublishers()
      .then(setPublishers)
      .catch((err) => {
        console.error('Failed to get publishers', err);
      });
    getSeries()
      .then(setSeries)
      .catch((err) => {
        console.error('Failed to get series', err);
      });
    getMetronSyncStatus()
      .then(setSyncStatus)
      .catch((err) => {
        console.error('Failed to get Metron sync status', err);
      });
  }, []);

  useEffect(() => {
    if (!syncStatus?.running) return;
    const id = setInterval(async () => {
      try {
        const status = await getMetronSyncStatus();
        setSyncStatus(status);
        if (!status.running) {
          clearInterval(id);
          fetchComics();
        }
      } catch {
        clearInterval(id);
      }
    }, SYNC_POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [syncStatus?.running, fetchComics]);

  const handleStartSync = async () => {
    setSyncLoading(true);
    setSyncError(null);
    try {
      setSyncStatus(await startMetronSync());
    } catch (err: unknown) {
      setSyncError(getErrorMessage(err, 'Failed to start sync'));
    } finally {
      setSyncLoading(false);
    }
  };

  const handleStopSync = async () => {
    try {
      setSyncStatus(await stopMetronSync());
    } catch (err: unknown) {
      setSyncError(getErrorMessage(err, 'Failed to stop sync'));
    }
  };

  const syncProgress =
    syncStatus && syncStatus.total > 0
      ? Math.round((syncStatus.processed / syncStatus.total) * 100)
      : 0;

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    if (key !== 'page') {
      params.set('page', '1');
    }
    setSearchParams(params);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilter('search', searchInput);
  };

  const publisherData = publishers.map((p) => ({
    value: String(p.id),
    label: p.name,
  }));

  const seriesData = series.map((s) => ({
    value: String(s.id),
    label: s.name,
  }));

  const readData = [
    { value: 'true', label: 'Read' },
    { value: 'false', label: 'Unread' },
  ];

  const groupByData = [
    { value: 'series', label: 'Series' },
    { value: 'publisher', label: 'Publisher' },
    { value: 'none', label: 'None' },
  ];

  const groupedComics = useMemo(() => {
    if (!result || groupBy === 'none') return null;
    const groups = new Map<string, ComicListItemDto[]>();
    for (const comic of result.data) {
      let key: string;
      if (groupBy === 'series') {
        key = comic.series?.name ?? 'No Series';
      } else {
        key = comic.publisher?.name ?? 'No Publisher';
      }
      if (!groups.has(key)) groups.set(key, []);
      const group = groups.get(key);
      if (group) group.push(comic);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [result, groupBy]);

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
              if (e.key === 'Enter') handleSearch(e);
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
      {result && (
        <Text size="sm" c="dimmed" mb="md">
          {isGrouped
            ? `${result.total} comics`
            : `Showing ${result.data.length} of ${result.total} comics (Page ${result.page} of ${result.totalPages})`}
        </Text>
      )}

      {/* Loading */}
      {loading && (
        <Center py="xl">
          <Loader size="lg" />
        </Center>
      )}

      {/* Grid */}
      {result && !loading && result.data.length > 0 && groupedComics && (
        <Stack gap="lg">
          {groupedComics.map(([groupName, comics]) => (
            <div key={groupName}>
              <Divider
                label={
                  <Text fw={600} size="sm">
                    {groupName} ({comics.length})
                  </Text>
                }
                labelPosition="left"
                mb="sm"
              />
              <SimpleGrid
                cols={{ base: 1, xs: 2, sm: 3, md: 4, lg: 6 }}
                spacing="md"
              >
                {comics.map((comic) => (
                  <ComicCard key={comic.id} comic={comic} />
                ))}
              </SimpleGrid>
            </div>
          ))}
        </Stack>
      )}

      {result && !loading && result.data.length > 0 && !groupedComics && (
        <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 4, lg: 6 }} spacing="md">
          {result.data.map((comic) => (
            <ComicCard key={comic.id} comic={comic} />
          ))}
        </SimpleGrid>
      )}

      {/* Empty */}
      {result && !loading && result.data.length === 0 && (
        <Center py="xl">
          <Stack align="center" gap="xs">
            <Text c="dimmed">No comics found. Try adjusting filters or</Text>
            <Anchor component={Link} to="/import">
              import your collection
            </Anchor>
          </Stack>
        </Center>
      )}

      {/* Pagination — only shown when not grouping */}
      {!isGrouped && result && result.totalPages > 1 && (
        <Center mt="xl">
          <Pagination
            total={result.totalPages}
            value={page}
            onChange={(newPage) => updateFilter('page', String(newPage))}
          />
        </Center>
      )}
    </Container>
  );
}
