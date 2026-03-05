import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getComics, getPublishers, getSeries, type ComicFilters } from '../../api/client';
import type {
  ComicListItemDto,
  PaginatedResponse,
  PublisherDto,
  SeriesDto,
} from '@comic-shelf/shared-types';
import {
  Container,
  Title,
  TextInput,
  Select,
  SimpleGrid,
  Card,
  Text,
  Badge,
  Group,
  Image,
  Pagination,
  Loader,
  Center,
  Stack,
  Anchor,
  Divider,
  Button,
} from '@mantine/core';
import { IconSearch, IconPlus } from '@tabler/icons-react';

export function ComicsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [result, setResult] = useState<PaginatedResponse<ComicListItemDto> | null>(null);
  const [publishers, setPublishers] = useState<PublisherDto[]>([]);
  const [series, setSeries] = useState<SeriesDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '');

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
        ? { page: 1, limit: 5000 }
        : { page, limit: 24 };
      if (search) filters.search = search;
      if (publisherId) filters.publisherId = parseInt(publisherId, 10);
      if (seriesId) filters.seriesId = parseInt(seriesId, 10);
      if (read) filters.read = read === 'true';
      const data = await getComics(filters);
      setResult(data);
    } catch (err) {
      console.error('Failed to fetch comics:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, publisherId, seriesId, read, isGrouped]);

  useEffect(() => {
    fetchComics();
  }, [fetchComics]);

  useEffect(() => {
    getPublishers().then(setPublishers).catch(console.error);
    getSeries().then(setSeries).catch(console.error);
  }, []);

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

  const formatPrice = (cents?: number | null, currency?: string | null) => {
    if (!cents) return '—';
    const dollars = (cents / 100).toFixed(2);
    if (currency === 'USD') return `$${dollars}`;
    if (currency === 'EUR') return `€${dollars}`;
    if (currency === 'GBP') return `£${dollars}`;
    return `${dollars} ${currency ?? ''}`;
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
        <Title order={1}>
          Comic Collection
        </Title>
        <Button
          component={Link}
          to="/add"
          leftSection={<IconPlus size={16} />}
        >
          Add via Metron
        </Button>
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
                  <ComicCard
                    key={comic.id}
                    comic={comic}
                    formatPrice={formatPrice}
                  />
                ))}
              </SimpleGrid>
            </div>
          ))}
        </Stack>
      )}

      {result && !loading && result.data.length > 0 && !groupedComics && (
        <SimpleGrid
          cols={{ base: 1, xs: 2, sm: 3, md: 4, lg: 6 }}
          spacing="md"
        >
          {result.data.map((comic) => (
            <ComicCard
              key={comic.id}
              comic={comic}
              formatPrice={formatPrice}
            />
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
            onChange={(newPage) =>
              updateFilter('page', String(newPage))
            }
          />
        </Center>
      )}
    </Container>
  );
}

function ComicCard({
  comic,
  formatPrice,
}: {
  comic: ComicListItemDto;
  formatPrice: (cents?: number | null, currency?: string | null) => string;
}) {
  return (
    <Card
      component={Link}
      to={`/comics/${comic.id}`}
      shadow="sm"
      padding="md"
      radius="md"
      withBorder
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      {comic.coverImageUrl && (
        <Card.Section>
          <Image
            src={comic.coverImageUrl}
            h={200}
            fit="cover"
            alt={comic.title}
          />
        </Card.Section>
      )}
      <Group justify="space-between" mb="xs" mt={comic.coverImageUrl ? 'sm' : undefined}>
        <Badge variant="light" color="gray" size="sm">
          #{comic.issueNumber ?? '—'}
        </Badge>
        {comic.read && (
          <Badge color="green" size="sm">
            Read
          </Badge>
        )}
      </Group>
      <Text fw={600} lineClamp={2} size="sm">
        {comic.title}
      </Text>
      {comic.series && (
        <Text size="xs" c="violet" mt={4}>
          {comic.series.name}
        </Text>
      )}
      <Group mt="xs" gap="xs" wrap="wrap">
        {comic.publisher && (
          <Text size="xs" c="dimmed">
            {comic.publisher.name}
          </Text>
        )}
        {comic.year && (
          <Text size="xs" c="dimmed">
            {comic.year}
          </Text>
        )}
        <Text size="xs" c="dimmed">
          {formatPrice(comic.coverPriceCents, comic.coverPriceCurrency)}
        </Text>
      </Group>
    </Card>
  );
}
