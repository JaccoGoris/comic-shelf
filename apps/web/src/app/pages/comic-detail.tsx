import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getComic, deleteComic } from '../../api/client';
import type { ComicDetailDto } from '@comic-shelf/shared-types';
import {
  Container,
  Title,
  Text,
  Button,
  Badge,
  Group,
  Image,
  Paper,
  SimpleGrid,
  Table,
  Loader,
  Center,
  Alert,
  Anchor,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconTrash, IconAlertCircle } from '@tabler/icons-react';

export function ComicDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [comic, setComic] = useState<ComicDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getComic(parseInt(id, 10))
      .then(setComic)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = () => {
    if (!comic) return;
    modals.openConfirmModal({
      title: 'Delete Comic',
      children: (
        <Text size="sm">
          Are you sure you want to delete &ldquo;{comic.title}&rdquo;? This
          action cannot be undone.
        </Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await deleteComic(comic.id);
          notifications.show({
            title: 'Deleted',
            message: `"${comic.title}" has been deleted.`,
            color: 'green',
          });
          navigate('/comics');
        } catch {
          notifications.show({
            title: 'Error',
            message: 'Failed to delete comic.',
            color: 'red',
          });
        }
      },
    });
  };

  const formatPrice = (cents?: number | null, currency?: string | null) => {
    if (!cents) return null;
    const dollars = (cents / 100).toFixed(2);
    if (currency === 'USD') return `$${dollars}`;
    if (currency === 'EUR') return `€${dollars}`;
    if (currency === 'GBP') return `£${dollars}`;
    return `${dollars} ${currency ?? ''}`;
  };

  if (loading) {
    return (
      <Center py="xl">
        <Loader size="lg" />
      </Center>
    );
  }

  if (error) {
    return (
      <Container size="sm" py="xl">
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Error"
          color="red"
        >
          {error}
        </Alert>
      </Container>
    );
  }

  if (!comic) {
    return (
      <Container size="sm" py="xl">
        <Text>Comic not found.</Text>
      </Container>
    );
  }

  const detailRows = [
    comic.publisher && ['Publisher', comic.publisher.name],
    comic.coverDate && ['Cover Date', comic.coverDate],
    comic.year && ['Year', comic.year],
    comic.era && ['Era', comic.era],
    comic.typeOfComic && ['Type', comic.typeOfComic],
    comic.language && ['Language', comic.language],
    comic.country && ['Country', comic.country],
    comic.numberOfPages && ['Pages', comic.numberOfPages],
    comic.printing && ['Printing', comic.printing],
    comic.variantNumber && ['Variant', comic.variantNumber],
    comic.coverLetter && ['Cover Letter', comic.coverLetter],
    comic.legacyNumber && ['Legacy #', comic.legacyNumber],
    comic.barcode && ['Barcode', comic.barcode],
    comic.metronId && ['Metron ID', comic.metronId],
    formatPrice(comic.coverPriceCents, comic.coverPriceCurrency) && [
      'Cover Price',
      formatPrice(comic.coverPriceCents, comic.coverPriceCurrency),
    ],
  ].filter(Boolean) as [string, string | number][];

  const collectionRows = [
    comic.collectionWishlist && ['Status', comic.collectionWishlist],
    formatPrice(comic.purchasePriceCents, comic.purchasePriceCurrency) && [
      'Purchase Price',
      formatPrice(comic.purchasePriceCents, comic.purchasePriceCurrency),
    ],
    comic.purchaseDate && [
      'Purchase Date',
      new Date(comic.purchaseDate).toLocaleDateString(),
    ],
    comic.purchasedFrom && ['Purchased From', comic.purchasedFrom],
    comic.condition && ['Condition', comic.condition],
    comic.storageLocation && ['Storage', comic.storageLocation],
    ['Quantity', comic.quantity],
    comic.loanedTo && ['Loaned To', comic.loanedTo],
    comic.signedBy && ['Signed By', comic.signedBy],
    comic.personalRating && ['Rating', comic.personalRating],
    comic.dateAdded && [
      'Date Added',
      new Date(comic.dateAdded).toLocaleDateString(),
    ],
  ].filter(Boolean) as [string, string | number][];

  const gradingRows = [
    comic.gradedBy && ['Graded By', comic.gradedBy],
    comic.gradedRating && ['Rating', comic.gradedRating],
    comic.gradedLabelType && ['Label Type', comic.gradedLabelType],
    comic.gradedSerialNumber && ['Serial #', comic.gradedSerialNumber],
    comic.graderNotes && ['Notes', comic.graderNotes],
    comic.pageQuality && ['Page Quality', comic.pageQuality],
  ].filter(Boolean) as [string, string][];

  return (
    <Container size="lg" py="md">
      <Button
        component={Link}
        to="/comics"
        variant="subtle"
        leftSection={<IconArrowLeft size={16} />}
        mb="md"
      >
        Back to collection
      </Button>

      <Group justify="space-between" align="flex-start" mb="lg" wrap="wrap">
        <Group align="flex-start" gap="lg" wrap="wrap">
          {comic.coverImageUrl && (
            <Image
              src={comic.coverImageUrl}
              w={200}
              radius="md"
              alt={comic.title}
            />
          )}
          <div>
          <Title order={1}>{comic.title}</Title>
          {comic.series && (
            <Text size="lg" c="violet" mt={4}>
              {comic.series.name}{' '}
              {comic.issueNumber && `#${comic.issueNumber}`}
              {comic.volume && ` (Vol. ${comic.volume})`}
            </Text>
          )}
          {comic.metronId && (
            <Anchor
              href={`https://metron.cloud/issue/${comic.metronId}/`}
              target="_blank"
              rel="noopener noreferrer"
              size="sm"
              mt={4}
            >
              View on Metron
            </Anchor>
          )}
          </div>
        </Group>
        <Group>
          <Badge
            color={comic.read ? 'green' : 'gray'}
            variant="filled"
            size="lg"
          >
            {comic.read ? 'Read' : 'Unread'}
          </Badge>
          <Button
            color="red"
            variant="outline"
            leftSection={<IconTrash size={16} />}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </Group>
      </Group>

      {comic.synopsis && (
        <Paper withBorder p="md" mb="lg" radius="md">
          <Title order={3} mb="xs">
            Synopsis
          </Title>
          <Text>{comic.synopsis}</Text>
        </Paper>
      )}

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg" mb="lg">
        {detailRows.length > 0 && (
          <Paper withBorder p="md" radius="md">
            <Title order={3} mb="sm">
              Details
            </Title>
            <Table>
              <Table.Tbody>
                {detailRows.map(([label, value]) => (
                  <Table.Tr key={label}>
                    <Table.Td fw={600} w={140}>
                      {label}
                    </Table.Td>
                    <Table.Td>{value}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        )}

        {collectionRows.length > 0 && (
          <Paper withBorder p="md" radius="md">
            <Title order={3} mb="sm">
              Collection
            </Title>
            <Table>
              <Table.Tbody>
                {collectionRows.map(([label, value]) => (
                  <Table.Tr key={label}>
                    <Table.Td fw={600} w={140}>
                      {label}
                    </Table.Td>
                    <Table.Td>{value}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        )}
      </SimpleGrid>

      {/* Creators */}
      {comic.creators.length > 0 && (
        <Paper withBorder p="md" mb="lg" radius="md">
          <Title order={3} mb="sm">
            Creators
          </Title>
          <Group gap="xs" wrap="wrap">
            {comic.creators.map((c) => (
              <Badge key={`${c.creator.id}-${c.role}`} variant="light" size="lg">
                {c.role.replace('_', ' ')}: {c.creator.name}
              </Badge>
            ))}
          </Group>
        </Paper>
      )}

      {/* Characters */}
      {comic.characters.length > 0 && (
        <Paper withBorder p="md" mb="lg" radius="md">
          <Title order={3} mb="sm">
            Characters
          </Title>
          <Group gap="xs" wrap="wrap">
            {comic.characters.map((c) => (
              <Badge key={c.id} variant="light" color="violet" size="lg">
                {c.name}
                {c.alias && ` (${c.alias})`}
              </Badge>
            ))}
          </Group>
        </Paper>
      )}

      {/* Story Arcs */}
      {comic.storyArcs.length > 0 && (
        <Paper withBorder p="md" mb="lg" radius="md">
          <Title order={3} mb="sm">
            Story Arcs
          </Title>
          <Group gap="xs" wrap="wrap">
            {comic.storyArcs.map((arc) => (
              <Badge key={arc.id} variant="light" color="indigo" size="lg">
                {arc.name}
              </Badge>
            ))}
          </Group>
        </Paper>
      )}

      {/* Genres */}
      {comic.genres.length > 0 && (
        <Paper withBorder p="md" mb="lg" radius="md">
          <Title order={3} mb="sm">
            Genres
          </Title>
          <Group gap="xs" wrap="wrap">
            {comic.genres.map((g) => (
              <Badge
                key={`${g.genre.id}-${g.type}`}
                variant="light"
                color={g.type === 'SUBGENRE' ? 'gray' : 'grape'}
                size="lg"
              >
                {g.genre.name}
                {g.type === 'SUBGENRE' && ' (sub)'}
              </Badge>
            ))}
          </Group>
        </Paper>
      )}

      {/* Grading */}
      {gradingRows.length > 0 && (
        <Paper withBorder p="md" mb="lg" radius="md">
          <Title order={3} mb="sm">
            Grading
          </Title>
          <Table>
            <Table.Tbody>
              {gradingRows.map(([label, value]) => (
                <Table.Tr key={label}>
                  <Table.Td fw={600} w={140}>
                    {label}
                  </Table.Td>
                  <Table.Td>{value}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      )}

      {/* Notes */}
      {comic.notes && (
        <Paper withBorder p="md" mb="lg" radius="md">
          <Title order={3} mb="xs">
            Notes
          </Title>
          <Text>{comic.notes}</Text>
        </Paper>
      )}
    </Container>
  );
}
