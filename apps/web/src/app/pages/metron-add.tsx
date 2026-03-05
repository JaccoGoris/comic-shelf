import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  searchMetronByUpc,
  getMetronIssue,
  importMetronIssue,
} from '../../api/client';
import type {
  MetronSearchResultDto,
  MetronIssueDetailDto,
} from '@comic-shelf/shared-types';
import {
  Container,
  Title,
  TextInput,
  Button,
  SimpleGrid,
  Card,
  Text,
  Badge,
  Group,
  Image,
  Paper,
  Table,
  Loader,
  Center,
  Stack,
  Alert,
  Anchor,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconSearch,
  IconArrowLeft,
  IconPlus,
  IconAlertCircle,
} from '@tabler/icons-react';

type Step = 'search' | 'results' | 'preview';

export function MetronAddPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('search');
  const [upc, setUpc] = useState('');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<MetronSearchResultDto[]>([]);
  const [detail, setDetail] = useState<MetronIssueDetailDto | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upc.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const data = await searchMetronByUpc(upc.trim());
      setResults(data);
      if (data.length === 0) {
        setError('No issues found for this UPC. Check the barcode and try again.');
      } else {
        setStep('results');
      }
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Failed to search Metron API.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectIssue = async (metronId: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMetronIssue(metronId);
      setDetail(data);
      setStep('preview');
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Failed to fetch issue details.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!detail) return;
    setImporting(true);
    setError(null);
    try {
      const result = await importMetronIssue(detail.id);
      notifications.show({
        title: 'Comic Added',
        message: `"${detail.series.name} #${detail.number}" has been added to your collection.`,
        color: 'green',
      });
      navigate(`/comics/${result.comicId}`);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Failed to import comic.';
      if (msg.includes('already exists')) {
        notifications.show({
          title: 'Already Exists',
          message: msg,
          color: 'yellow',
        });
      } else {
        setError(msg);
      }
    } finally {
      setImporting(false);
    }
  };

  const handleBack = () => {
    setError(null);
    if (step === 'preview') {
      setDetail(null);
      setStep('results');
    } else if (step === 'results') {
      setResults([]);
      setStep('search');
    }
  };

  return (
    <Container size="lg" py="md">
      <Title order={1} mb="lg">
        Add Comic via Metron
      </Title>

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

      {/* Step 1: Search */}
      {step === 'search' && (
        <Paper withBorder p="lg" radius="md">
          <Title order={3} mb="md">
            Search by UPC
          </Title>
          <Text size="sm" c="dimmed" mb="md">
            Enter the barcode (UPC) from the comic to look it up on Metron.
          </Text>
          <form onSubmit={handleSearch}>
            <Group align="flex-end">
              <TextInput
                placeholder="e.g. 75960620919800111"
                value={upc}
                onChange={(e) => setUpc(e.currentTarget.value)}
                leftSection={<IconSearch size={16} />}
                style={{ flex: 1 }}
                size="md"
              />
              <Button
                type="submit"
                loading={loading}
                leftSection={<IconSearch size={16} />}
                size="md"
              >
                Search
              </Button>
            </Group>
          </form>
        </Paper>
      )}

      {/* Step 2: Results list */}
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

          <Text size="sm" c="dimmed" mb="md">
            {results.length} result{results.length !== 1 ? 's' : ''} found for
            UPC: {upc}
          </Text>

          {loading ? (
            <Center py="xl">
              <Loader size="lg" />
            </Center>
          ) : (
            <SimpleGrid
              cols={{ base: 1, xs: 2, sm: 3, md: 4 }}
              spacing="md"
            >
              {results.map((issue) => (
                <Card
                  key={issue.id}
                  shadow="sm"
                  padding="sm"
                  radius="md"
                  withBorder
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleSelectIssue(issue.id)}
                >
                  {issue.image && (
                    <Card.Section>
                      <Image
                        src={issue.image}
                        h={280}
                        fit="cover"
                        alt={issue.issue}
                      />
                    </Card.Section>
                  )}
                  <Stack gap="xs" mt="sm">
                    <Text fw={600} size="sm" lineClamp={2}>
                      {issue.issue}
                    </Text>
                    <Text size="xs" c="violet">
                      {issue.series.name} (Vol. {issue.series.volume},{' '}
                      {issue.series.yearBegan})
                    </Text>
                    <Group gap="xs">
                      <Badge variant="light" size="sm">
                        #{issue.number}
                      </Badge>
                      <Text size="xs" c="dimmed">
                        {issue.coverDate}
                      </Text>
                    </Group>
                  </Stack>
                </Card>
              ))}
            </SimpleGrid>
          )}
        </>
      )}

      {/* Step 3: Preview & Confirm */}
      {step === 'preview' && detail && (
        <>
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            onClick={handleBack}
            mb="md"
          >
            Back to results
          </Button>

          {loading ? (
            <Center py="xl">
              <Loader size="lg" />
            </Center>
          ) : (
            <PreviewPanel
              detail={detail}
              importing={importing}
              onImport={handleImport}
            />
          )}
        </>
      )}
    </Container>
  );
}

// ─── Preview panel ───────────────────────────────────────

function PreviewPanel({
  detail,
  importing,
  onImport,
}: {
  detail: MetronIssueDetailDto;
  importing: boolean;
  onImport: () => void;
}) {
  const detailRows = [
    ['Publisher', detail.publisher.name],
    ['Series', `${detail.series.name} (Vol. ${detail.series.volume})`],
    ['Issue', `#${detail.number}`],
    ['Cover Date', detail.coverDate],
    detail.storeDate && ['Store Date', detail.storeDate],
    detail.price && [
      'Price',
      `${detail.price} ${detail.priceCurrency ?? ''}`.trim(),
    ],
    detail.page && ['Pages', detail.page],
    detail.upc && ['UPC', detail.upc],
    detail.isbn && ['ISBN', detail.isbn],
    ['Series Type', detail.series.seriesType.name],
    ['Metron ID', detail.id],
  ].filter(Boolean) as [string, string | number][];

  return (
    <Stack gap="lg">
      {/* Header with cover + info */}
      <Group align="flex-start" wrap="wrap" gap="lg">
        {detail.image && (
          <Image
            src={detail.image}
            w={250}
            radius="md"
            alt={`${detail.series.name} #${detail.number} cover`}
          />
        )}
        <Stack style={{ flex: 1, minWidth: 250 }}>
          <Title order={2}>
            {detail.series.name} #{detail.number}
          </Title>
          {detail.title && (
            <Text size="lg" c="dimmed">
              {detail.title}
            </Text>
          )}
          {detail.name.length > 0 && (
            <Text size="sm" c="dimmed">
              Stories: {detail.name.join(', ')}
            </Text>
          )}
          <Anchor
            href={detail.resourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            size="sm"
          >
            View on Metron
          </Anchor>

          <Button
            leftSection={<IconPlus size={16} />}
            loading={importing}
            onClick={onImport}
            size="lg"
            mt="md"
          >
            Add to Collection
          </Button>
        </Stack>
      </Group>

      {/* Synopsis */}
      {detail.desc && (
        <Paper withBorder p="md" radius="md">
          <Title order={3} mb="xs">
            Synopsis
          </Title>
          <Text>{detail.desc}</Text>
        </Paper>
      )}

      {/* Details table */}
      <Paper withBorder p="md" radius="md">
        <Title order={3} mb="sm">
          Details
        </Title>
        <Table>
          <Table.Tbody>
            {detailRows.map(([label, value]) => (
              <Table.Tr key={String(label)}>
                <Table.Td fw={600} w={140}>
                  {label}
                </Table.Td>
                <Table.Td>{value}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      {/* Credits */}
      {detail.credits.length > 0 && (
        <Paper withBorder p="md" radius="md">
          <Title order={3} mb="sm">
            Credits
          </Title>
          <Group gap="xs" wrap="wrap">
            {detail.credits.map((c) =>
              c.role.map((r) => (
                <Badge key={`${c.id}-${r.id}`} variant="light" size="lg">
                  {r.name}: {c.creator}
                </Badge>
              )),
            )}
          </Group>
        </Paper>
      )}

      {/* Characters */}
      {detail.characters.length > 0 && (
        <Paper withBorder p="md" radius="md">
          <Title order={3} mb="sm">
            Characters
          </Title>
          <Group gap="xs" wrap="wrap">
            {detail.characters.map((c) => (
              <Badge key={c.id} variant="light" color="violet" size="lg">
                {c.name}
              </Badge>
            ))}
          </Group>
        </Paper>
      )}

      {/* Story Arcs */}
      {detail.arcs.length > 0 && (
        <Paper withBorder p="md" radius="md">
          <Title order={3} mb="sm">
            Story Arcs
          </Title>
          <Group gap="xs" wrap="wrap">
            {detail.arcs.map((arc) => (
              <Badge key={arc.id} variant="light" color="indigo" size="lg">
                {arc.name}
              </Badge>
            ))}
          </Group>
        </Paper>
      )}

      {/* Teams */}
      {detail.teams.length > 0 && (
        <Paper withBorder p="md" radius="md">
          <Title order={3} mb="sm">
            Teams
          </Title>
          <Group gap="xs" wrap="wrap">
            {detail.teams.map((t) => (
              <Badge key={t.id} variant="light" color="cyan" size="lg">
                {t.name}
              </Badge>
            ))}
          </Group>
        </Paper>
      )}

      {/* Genres */}
      {detail.series.genres.length > 0 && (
        <Paper withBorder p="md" radius="md">
          <Title order={3} mb="sm">
            Genres
          </Title>
          <Group gap="xs" wrap="wrap">
            {detail.series.genres.map((g) => (
              <Badge key={g.id} variant="light" color="grape" size="lg">
                {g.name}
              </Badge>
            ))}
          </Group>
        </Paper>
      )}
    </Stack>
  );
}
