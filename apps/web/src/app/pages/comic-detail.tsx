import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  getComic,
  deleteComic,
  updateComic,
  syncSingleComic,
  getPublishers,
  getSeries,
  getCreators,
  getCharacters,
  getGenres,
  getStoryArcs,
} from '../../api/client'
import { TypeaheadField } from '../components/typeahead-field'
import type { ComicDetailDto, UpdateComicDto } from '@comic-shelf/shared-types'
import placeholderImg from '../../assets/comic-card-placeholder.webp'
import { useForm } from '@mantine/form'
import { zodResolver } from 'mantine-form-zod-resolver'
import { comicFormSchema, type ComicFormValues } from './comic-detail-schema'
import {
  Container,
  Title,
  Text,
  TextInput,
  Textarea,
  NumberInput,
  Select,
  Checkbox,
  Button,
  Group,
  Image,
  Paper,
  SimpleGrid,
  ActionIcon,
  Loader,
  Center,
  Alert,
  Anchor,
  Stack,
} from '@mantine/core'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import {
  IconArrowLeft,
  IconTrash,
  IconAlertCircle,
  IconRefresh,
  IconDeviceFloppy,
  IconPlus,
  IconX,
} from '@tabler/icons-react'

function comicToFormValues(comic: ComicDetailDto): ComicFormValues {
  return {
    title: comic.title,
    synopsis: comic.synopsis ?? null,
    issueNumber: comic.issueNumber ?? null,
    volume: comic.volume ?? null,
    year: comic.year ?? null,
    coverDate: comic.coverDate ?? null,
    barcode: comic.barcode ?? null,
    legacyNumber: comic.legacyNumber ?? null,
    variantNumber: comic.variantNumber ?? null,
    coverLetter: comic.coverLetter ?? null,
    era: comic.era ?? null,
    language: comic.language ?? null,
    country: comic.country ?? null,
    typeOfComic: comic.typeOfComic ?? null,
    numberOfPages: comic.numberOfPages ?? null,
    printing: comic.printing ?? null,
    coverPriceCents: comic.coverPriceCents ?? null,
    coverPriceCurrency: comic.coverPriceCurrency ?? null,
    read: comic.read,
    preordered: comic.preordered,
    forSale: comic.forSale,
    quantity: comic.quantity,
    condition: comic.condition ?? null,
    storageLocation: comic.storageLocation ?? null,
    loanedTo: comic.loanedTo ?? null,
    signedBy: comic.signedBy ?? null,
    personalRating: comic.personalRating ?? null,
    purchasePriceCents: comic.purchasePriceCents ?? null,
    purchasePriceCurrency: comic.purchasePriceCurrency ?? null,
    purchaseDate: comic.purchaseDate
      ? comic.purchaseDate.substring(0, 10)
      : null,
    purchasedFrom: comic.purchasedFrom ?? null,
    collectionWishlist: comic.collectionWishlist ?? null,
    notes: comic.notes ?? null,
    gradedBy: comic.gradedBy ?? null,
    gradedRating: comic.gradedRating ?? null,
    gradedLabelType: comic.gradedLabelType ?? null,
    gradedSerialNumber: comic.gradedSerialNumber ?? null,
    graderNotes: comic.graderNotes ?? null,
    pageQuality: comic.pageQuality ?? null,
    publisherName: comic.publisher?.name ?? null,
    seriesName: comic.series?.name ?? null,
    creators: comic.creators.map((c) => ({
      name: c.creator.name,
      role: c.role,
    })),
    characters: comic.characters.map((c) => ({ name: c.name })),
    storyArcs: comic.storyArcs.map((a) => ({ name: a.name })),
    genres: comic.genres.map((g) => ({ name: g.genre.name, type: g.type })),
  }
}

function formValuesToDto(values: ComicFormValues): UpdateComicDto {
  return {
    title: values.title,
    synopsis: values.synopsis,
    issueNumber: values.issueNumber,
    volume: values.volume,
    year: values.year,
    coverDate: values.coverDate,
    barcode: values.barcode,
    legacyNumber: values.legacyNumber,
    variantNumber: values.variantNumber,
    coverLetter: values.coverLetter,
    era: values.era,
    language: values.language,
    country: values.country,
    typeOfComic: values.typeOfComic,
    numberOfPages: values.numberOfPages,
    printing: values.printing,
    coverPriceCents: values.coverPriceCents,
    coverPriceCurrency: values.coverPriceCurrency,
    read: values.read,
    preordered: values.preordered,
    forSale: values.forSale,
    quantity: values.quantity,
    condition: values.condition,
    storageLocation: values.storageLocation,
    loanedTo: values.loanedTo,
    signedBy: values.signedBy,
    personalRating: values.personalRating,
    purchasePriceCents: values.purchasePriceCents,
    purchasePriceCurrency: values.purchasePriceCurrency,
    purchaseDate: values.purchaseDate,
    purchasedFrom: values.purchasedFrom,
    collectionWishlist: values.collectionWishlist,
    notes: values.notes,
    gradedBy: values.gradedBy,
    gradedRating: values.gradedRating,
    gradedLabelType: values.gradedLabelType,
    gradedSerialNumber: values.gradedSerialNumber,
    graderNotes: values.graderNotes,
    pageQuality: values.pageQuality,
    publisher: values.publisherName ? { name: values.publisherName } : null,
    series: values.seriesName ? { name: values.seriesName } : null,
    creators: values.creators,
    characters: values.characters,
    storyArcs: values.storyArcs,
    genres: values.genres,
  }
}

const fetchPublisherNames = (s?: string) =>
  getPublishers(s).then((r) => [...new Set(r.map((i) => i.name))])
const fetchSeriesNames = (s?: string) =>
  getSeries(s).then((r) => [...new Set(r.map((i) => i.name))])
const fetchCreatorNames = (s?: string) =>
  getCreators(s).then((r) => r.map((i) => i.name))
const fetchCharacterNames = (s?: string) =>
  getCharacters(s).then((r) => r.map((i) => i.name))
const fetchStoryArcNames = (s?: string) =>
  getStoryArcs(s).then((r) => r.map((i) => i.name))
const fetchGenreNames = (s?: string) =>
  getGenres(s).then((r) => r.map((i) => i.name))

const ROLE_OPTIONS = [
  { value: 'WRITER', label: 'Writer' },
  { value: 'ARTIST', label: 'Artist' },
  { value: 'PENCILLER', label: 'Penciller' },
  { value: 'INKER', label: 'Inker' },
  { value: 'COLORIST', label: 'Colorist' },
  { value: 'COVER_ARTIST', label: 'Cover Artist' },
  { value: 'LETTERER', label: 'Letterer' },
  { value: 'EDITOR', label: 'Editor' },
  { value: 'CREATED_BY', label: 'Created By' },
]

const GENRE_TYPE_OPTIONS = [
  { value: 'GENRE', label: 'Genre' },
  { value: 'SUBGENRE', label: 'Subgenre' },
]

export function ComicDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [comic, setComic] = useState<ComicDetailDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const form = useForm<ComicFormValues>({
    mode: 'uncontrolled',
    validate: zodResolver(comicFormSchema),
    initialValues: {
      title: '',
      synopsis: null,
      issueNumber: null,
      volume: null,
      year: null,
      coverDate: null,
      barcode: null,
      legacyNumber: null,
      variantNumber: null,
      coverLetter: null,
      era: null,
      language: null,
      country: null,
      typeOfComic: null,
      numberOfPages: null,
      printing: null,
      coverPriceCents: null,
      coverPriceCurrency: null,
      read: false,
      preordered: false,
      forSale: false,
      quantity: 1,
      condition: null,
      storageLocation: null,
      loanedTo: null,
      signedBy: null,
      personalRating: null,
      purchasePriceCents: null,
      purchasePriceCurrency: null,
      purchaseDate: null,
      purchasedFrom: null,
      collectionWishlist: null,
      notes: null,
      gradedBy: null,
      gradedRating: null,
      gradedLabelType: null,
      gradedSerialNumber: null,
      graderNotes: null,
      pageQuality: null,
      publisherName: null,
      seriesName: null,
      creators: [],
      characters: [],
      storyArcs: [],
      genres: [],
    },
  })

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getComic(parseInt(id, 10))
      .then((data) => {
        setComic(data)
        form.setValues(comicToFormValues(data))
        form.resetDirty(comicToFormValues(data))
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleSave = async (values: ComicFormValues) => {
    if (!comic) return
    setSaving(true)
    try {
      const dto = formValuesToDto(values)
      const updated = await updateComic(comic.id, dto)
      setComic(updated)
      form.setValues(comicToFormValues(updated))
      form.resetDirty(comicToFormValues(updated))
      notifications.show({
        title: 'Saved',
        message: 'Comic updated successfully.',
        color: 'green',
      })

      // Auto-sync with Metron if comic has barcode but no metronId
      if (updated.barcode && !updated.metronId) {
        setSyncing(true)
        try {
          const result = await syncSingleComic(updated.id)
          if (result.status === 'synced') {
            notifications.show({
              title: 'Synced with Metron',
              message: `Updated: ${result.updatedFields?.join(', ') ?? 'none'}`,
              color: 'green',
            })
            const refreshed = await getComic(updated.id)
            setComic(refreshed)
            form.setValues(comicToFormValues(refreshed))
            form.resetDirty(comicToFormValues(refreshed))
          } else if (result.status === 'skipped') {
            notifications.show({
              title: 'Metron sync skipped',
              message: result.reason ?? 'Unknown reason',
              color: 'yellow',
            })
          }
        } catch {
          notifications.show({
            title: 'Metron sync failed',
            message: 'Could not sync with Metron after save.',
            color: 'red',
          })
        } finally {
          setSyncing(false)
        }
      }
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Failed to save comic.',
        color: 'red',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = () => {
    if (!comic) return
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
          await deleteComic(comic.id)
          notifications.show({
            title: 'Deleted',
            message: `"${comic.title}" has been deleted.`,
            color: 'green',
          })
          navigate('/comics')
        } catch {
          notifications.show({
            title: 'Error',
            message: 'Failed to delete comic.',
            color: 'red',
          })
        }
      },
    })
  }

  const handleSync = async () => {
    if (!comic) return
    setSyncing(true)
    try {
      const result = await syncSingleComic(comic.id)
      if (result.status === 'synced') {
        notifications.show({
          title: 'Synced successfully',
          message: `Updated: ${result.updatedFields?.join(', ') ?? 'none'}`,
          color: 'green',
        })
        const updated = await getComic(comic.id)
        setComic(updated)
        form.setValues(comicToFormValues(updated))
        form.resetDirty(comicToFormValues(updated))
      } else if (result.status === 'skipped') {
        notifications.show({
          title: 'Sync skipped',
          message: result.reason ?? 'Unknown reason',
          color: 'yellow',
        })
      } else {
        notifications.show({
          title: 'Sync failed',
          message: result.reason ?? 'Unknown error',
          color: 'red',
        })
      }
    } catch {
      notifications.show({
        title: 'Sync error',
        message: 'Failed to sync with Metron.',
        color: 'red',
      })
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <Center py="xl">
        <Loader size="lg" />
      </Center>
    )
  }

  if (error) {
    return (
      <Container size="sm" py="xl">
        <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
          {error}
        </Alert>
      </Container>
    )
  }

  if (!comic) {
    return (
      <Container size="sm" py="xl">
        <Text>Comic not found.</Text>
      </Container>
    )
  }

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

      <form onSubmit={form.onSubmit(handleSave)}>
        {/* Header */}
        <Group justify="space-between" align="flex-start" mb="lg" wrap="wrap">
          <Group align="flex-start" gap="lg" wrap="wrap">
            <Image
              src={comic.coverImageUrl ?? placeholderImg}
              w={200}
              radius="md"
              fit="cover"
              alt={comic.title}
            />
            <div>
              <TextInput
                size="xl"
                fw={700}
                placeholder="Title"
                key={form.key('title')}
                {...form.getInputProps('title')}
              />
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
            <Button
              type="submit"
              leftSection={<IconDeviceFloppy size={16} />}
              loading={saving || syncing}
              disabled={!form.isDirty()}
            >
              Save
            </Button>
            {!comic.metronId && (
              <Button
                variant="outline"
                leftSection={<IconRefresh size={16} />}
                onClick={handleSync}
                loading={syncing}
              >
                Sync with Metron
              </Button>
            )}
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

        {/* Synopsis */}
        <Paper withBorder p="md" mb="lg" radius="md">
          <Title order={3} mb="xs">
            Synopsis
          </Title>
          <Textarea
            autosize
            minRows={2}
            placeholder="Synopsis"
            key={form.key('synopsis')}
            {...form.getInputProps('synopsis')}
          />
        </Paper>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg" mb="lg">
          {/* Details */}
          <Paper withBorder p="md" radius="md">
            <Title order={3} mb="sm">
              Details
            </Title>
            <Stack gap="xs">
              <TypeaheadField
                label="Publisher"
                placeholder="Publisher name"
                fetchOptions={fetchPublisherNames}
                key={form.key('publisherName')}
                {...form.getInputProps('publisherName')}
              />
              <TypeaheadField
                label="Series"
                placeholder="Series name"
                fetchOptions={fetchSeriesNames}
                key={form.key('seriesName')}
                {...form.getInputProps('seriesName')}
              />
              <Group grow>
                <TextInput
                  label="Issue #"
                  placeholder="Issue number"
                  key={form.key('issueNumber')}
                  {...form.getInputProps('issueNumber')}
                />
                <TextInput
                  label="Volume"
                  placeholder="Volume"
                  key={form.key('volume')}
                  {...form.getInputProps('volume')}
                />
              </Group>
              <Group grow>
                <TextInput
                  label="Cover Date"
                  placeholder="e.g. 2024-01"
                  key={form.key('coverDate')}
                  {...form.getInputProps('coverDate')}
                />
                <NumberInput
                  label="Year"
                  placeholder="Year"
                  key={form.key('year')}
                  {...form.getInputProps('year')}
                />
              </Group>
              <Group grow>
                <TextInput
                  label="Era"
                  placeholder="Era"
                  key={form.key('era')}
                  {...form.getInputProps('era')}
                />
                <TextInput
                  label="Type"
                  placeholder="Type of comic"
                  key={form.key('typeOfComic')}
                  {...form.getInputProps('typeOfComic')}
                />
              </Group>
              <Group grow>
                <TextInput
                  label="Language"
                  placeholder="Language"
                  key={form.key('language')}
                  {...form.getInputProps('language')}
                />
                <TextInput
                  label="Country"
                  placeholder="Country"
                  key={form.key('country')}
                  {...form.getInputProps('country')}
                />
              </Group>
              <Group grow>
                <NumberInput
                  label="Pages"
                  placeholder="Number of pages"
                  key={form.key('numberOfPages')}
                  {...form.getInputProps('numberOfPages')}
                />
                <TextInput
                  label="Printing"
                  placeholder="Printing"
                  key={form.key('printing')}
                  {...form.getInputProps('printing')}
                />
              </Group>
              <Group grow>
                <TextInput
                  label="Variant"
                  placeholder="Variant number"
                  key={form.key('variantNumber')}
                  {...form.getInputProps('variantNumber')}
                />
                <TextInput
                  label="Cover Letter"
                  placeholder="Cover letter"
                  key={form.key('coverLetter')}
                  {...form.getInputProps('coverLetter')}
                />
              </Group>
              <TextInput
                label="Legacy #"
                placeholder="Legacy number"
                key={form.key('legacyNumber')}
                {...form.getInputProps('legacyNumber')}
              />
              <TextInput
                label="Barcode"
                placeholder="Barcode / UPC"
                key={form.key('barcode')}
                {...form.getInputProps('barcode')}
              />
              <Group grow>
                <NumberInput
                  label="Cover Price (cents)"
                  placeholder="Price in cents"
                  key={form.key('coverPriceCents')}
                  {...form.getInputProps('coverPriceCents')}
                />
                <TextInput
                  label="Currency"
                  placeholder="e.g. USD"
                  key={form.key('coverPriceCurrency')}
                  {...form.getInputProps('coverPriceCurrency')}
                />
              </Group>
            </Stack>
          </Paper>

          {/* Collection */}
          <Paper withBorder p="md" radius="md">
            <Title order={3} mb="sm">
              Collection
            </Title>
            <Stack gap="xs">
              <Select
                label="Status"
                placeholder="Select status"
                data={[
                  { value: 'COLLECTION', label: 'Collection' },
                  { value: 'WISHLIST', label: 'Wishlist' },
                ]}
                clearable
                key={form.key('collectionWishlist')}
                {...form.getInputProps('collectionWishlist')}
              />
              <Group grow>
                <NumberInput
                  label="Purchase Price (cents)"
                  placeholder="Price in cents"
                  key={form.key('purchasePriceCents')}
                  {...form.getInputProps('purchasePriceCents')}
                />
                <TextInput
                  label="Currency"
                  placeholder="e.g. USD"
                  key={form.key('purchasePriceCurrency')}
                  {...form.getInputProps('purchasePriceCurrency')}
                />
              </Group>
              <TextInput
                label="Purchase Date"
                placeholder="YYYY-MM-DD"
                key={form.key('purchaseDate')}
                {...form.getInputProps('purchaseDate')}
              />
              <TextInput
                label="Purchased From"
                placeholder="Store / seller"
                key={form.key('purchasedFrom')}
                {...form.getInputProps('purchasedFrom')}
              />
              <TextInput
                label="Condition"
                placeholder="e.g. Near Mint"
                key={form.key('condition')}
                {...form.getInputProps('condition')}
              />
              <TextInput
                label="Storage Location"
                placeholder="Where it's stored"
                key={form.key('storageLocation')}
                {...form.getInputProps('storageLocation')}
              />
              <NumberInput
                label="Quantity"
                min={1}
                key={form.key('quantity')}
                {...form.getInputProps('quantity')}
              />
              <TextInput
                label="Loaned To"
                placeholder="Person name"
                key={form.key('loanedTo')}
                {...form.getInputProps('loanedTo')}
              />
              <TextInput
                label="Signed By"
                placeholder="Signer name"
                key={form.key('signedBy')}
                {...form.getInputProps('signedBy')}
              />
              <TextInput
                label="Personal Rating"
                placeholder="Your rating"
                key={form.key('personalRating')}
                {...form.getInputProps('personalRating')}
              />
              <Group>
                <Checkbox
                  label="Read"
                  key={form.key('read')}
                  {...form.getInputProps('read', { type: 'checkbox' })}
                />
                <Checkbox
                  label="Preordered"
                  key={form.key('preordered')}
                  {...form.getInputProps('preordered', { type: 'checkbox' })}
                />
                <Checkbox
                  label="For Sale"
                  key={form.key('forSale')}
                  {...form.getInputProps('forSale', { type: 'checkbox' })}
                />
              </Group>
            </Stack>
          </Paper>
        </SimpleGrid>

        {/* Creators */}
        <Paper withBorder p="md" mb="lg" radius="md">
          <Group justify="space-between" mb="sm">
            <Title order={3}>Creators</Title>
            <Button
              variant="light"
              size="xs"
              leftSection={<IconPlus size={14} />}
              onClick={() =>
                form.insertListItem('creators', {
                  name: '',
                  role: 'WRITER',
                })
              }
            >
              Add Creator
            </Button>
          </Group>
          <Stack gap="xs">
            {form.getValues().creators.map((_, index) => (
              <Group key={index} wrap="nowrap">
                <TypeaheadField
                  placeholder="Creator name"
                  style={{ flex: 1 }}
                  fetchOptions={fetchCreatorNames}
                  key={form.key(`creators.${index}.name`)}
                  {...form.getInputProps(`creators.${index}.name`)}
                />
                <Select
                  placeholder="Role"
                  data={ROLE_OPTIONS}
                  w={160}
                  key={form.key(`creators.${index}.role`)}
                  {...form.getInputProps(`creators.${index}.role`)}
                />
                <ActionIcon
                  color="red"
                  variant="subtle"
                  onClick={() => form.removeListItem('creators', index)}
                >
                  <IconX size={16} />
                </ActionIcon>
              </Group>
            ))}
            {form.getValues().creators.length === 0 && (
              <Text size="sm" c="dimmed">
                No creators added.
              </Text>
            )}
          </Stack>
        </Paper>

        {/* Characters */}
        <Paper withBorder p="md" mb="lg" radius="md">
          <Group justify="space-between" mb="sm">
            <Title order={3}>Characters</Title>
            <Button
              variant="light"
              size="xs"
              leftSection={<IconPlus size={14} />}
              onClick={() => form.insertListItem('characters', { name: '' })}
            >
              Add Character
            </Button>
          </Group>
          <Stack gap="xs">
            {form.getValues().characters.map((_, index) => (
              <Group key={index} wrap="nowrap">
                <TypeaheadField
                  placeholder="Character name"
                  style={{ flex: 1 }}
                  fetchOptions={fetchCharacterNames}
                  key={form.key(`characters.${index}.name`)}
                  {...form.getInputProps(`characters.${index}.name`)}
                />
                <ActionIcon
                  color="red"
                  variant="subtle"
                  onClick={() => form.removeListItem('characters', index)}
                >
                  <IconX size={16} />
                </ActionIcon>
              </Group>
            ))}
            {form.getValues().characters.length === 0 && (
              <Text size="sm" c="dimmed">
                No characters added.
              </Text>
            )}
          </Stack>
        </Paper>

        {/* Story Arcs */}
        <Paper withBorder p="md" mb="lg" radius="md">
          <Group justify="space-between" mb="sm">
            <Title order={3}>Story Arcs</Title>
            <Button
              variant="light"
              size="xs"
              leftSection={<IconPlus size={14} />}
              onClick={() => form.insertListItem('storyArcs', { name: '' })}
            >
              Add Story Arc
            </Button>
          </Group>
          <Stack gap="xs">
            {form.getValues().storyArcs.map((_, index) => (
              <Group key={index} wrap="nowrap">
                <TypeaheadField
                  placeholder="Story arc name"
                  style={{ flex: 1 }}
                  fetchOptions={fetchStoryArcNames}
                  key={form.key(`storyArcs.${index}.name`)}
                  {...form.getInputProps(`storyArcs.${index}.name`)}
                />
                <ActionIcon
                  color="red"
                  variant="subtle"
                  onClick={() => form.removeListItem('storyArcs', index)}
                >
                  <IconX size={16} />
                </ActionIcon>
              </Group>
            ))}
            {form.getValues().storyArcs.length === 0 && (
              <Text size="sm" c="dimmed">
                No story arcs added.
              </Text>
            )}
          </Stack>
        </Paper>

        {/* Genres */}
        <Paper withBorder p="md" mb="lg" radius="md">
          <Group justify="space-between" mb="sm">
            <Title order={3}>Genres</Title>
            <Button
              variant="light"
              size="xs"
              leftSection={<IconPlus size={14} />}
              onClick={() =>
                form.insertListItem('genres', {
                  name: '',
                  type: 'GENRE',
                })
              }
            >
              Add Genre
            </Button>
          </Group>
          <Stack gap="xs">
            {form.getValues().genres.map((_, index) => (
              <Group key={index} wrap="nowrap">
                <TypeaheadField
                  placeholder="Genre name"
                  style={{ flex: 1 }}
                  fetchOptions={fetchGenreNames}
                  key={form.key(`genres.${index}.name`)}
                  {...form.getInputProps(`genres.${index}.name`)}
                />
                <Select
                  placeholder="Type"
                  data={GENRE_TYPE_OPTIONS}
                  w={130}
                  key={form.key(`genres.${index}.type`)}
                  {...form.getInputProps(`genres.${index}.type`)}
                />
                <ActionIcon
                  color="red"
                  variant="subtle"
                  onClick={() => form.removeListItem('genres', index)}
                >
                  <IconX size={16} />
                </ActionIcon>
              </Group>
            ))}
            {form.getValues().genres.length === 0 && (
              <Text size="sm" c="dimmed">
                No genres added.
              </Text>
            )}
          </Stack>
        </Paper>

        {/* Grading */}
        <Paper withBorder p="md" mb="lg" radius="md">
          <Title order={3} mb="sm">
            Grading
          </Title>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xs">
            <TextInput
              label="Graded By"
              placeholder="Grading company"
              key={form.key('gradedBy')}
              {...form.getInputProps('gradedBy')}
            />
            <TextInput
              label="Rating"
              placeholder="Grade rating"
              key={form.key('gradedRating')}
              {...form.getInputProps('gradedRating')}
            />
            <TextInput
              label="Label Type"
              placeholder="Label type"
              key={form.key('gradedLabelType')}
              {...form.getInputProps('gradedLabelType')}
            />
            <TextInput
              label="Serial #"
              placeholder="Serial number"
              key={form.key('gradedSerialNumber')}
              {...form.getInputProps('gradedSerialNumber')}
            />
            <TextInput
              label="Page Quality"
              placeholder="Page quality"
              key={form.key('pageQuality')}
              {...form.getInputProps('pageQuality')}
            />
            <Textarea
              label="Grader Notes"
              placeholder="Notes from grader"
              key={form.key('graderNotes')}
              {...form.getInputProps('graderNotes')}
            />
          </SimpleGrid>
        </Paper>

        {/* Notes */}
        <Paper withBorder p="md" mb="lg" radius="md">
          <Title order={3} mb="xs">
            Notes
          </Title>
          <Textarea
            autosize
            minRows={2}
            placeholder="Personal notes"
            key={form.key('notes')}
            {...form.getInputProps('notes')}
          />
        </Paper>
      </form>
    </Container>
  )
}
