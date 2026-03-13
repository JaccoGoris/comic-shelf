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
  getMetronSeriesById,
  createTrackedSeries,
} from '../../api/client'
import { TypeaheadField } from '../components/typeahead-field'
import { TagsInputField } from '../components/tags-input-field'
import { CSButton } from '../components/cs-button'
import type {
  ComicDetailDto,
  UpdateComicDto,
  CreatorRole,
} from '@comic-shelf/shared-types'
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
  Loader,
  Center,
  Alert,
  Stack,
  Flex,
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
  IconLayersLinked,
  IconEye,
} from '@tabler/icons-react'

const CREATOR_ROLE_TO_FIELD = {
  WRITER: 'creatorsWriter',
  ARTIST: 'creatorsArtist',
  PENCILLER: 'creatorsPenciller',
  INKER: 'creatorsInker',
  COLORIST: 'creatorsColorist',
  COVER_ARTIST: 'creatorsCoverArtist',
  LETTERER: 'creatorsLetterer',
  EDITOR: 'creatorsEditor',
  CREATED_BY: 'creatorsCreatedBy',
} as const

type CreatorField = (typeof CREATOR_ROLE_TO_FIELD)[CreatorRole]

const ALL_ROLES = Object.keys(CREATOR_ROLE_TO_FIELD) as CreatorRole[]

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

function getRoleLabel(role: CreatorRole): string {
  return ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role
}

function comicToFormValues(comic: ComicDetailDto): ComicFormValues {
  const creatorsByRole = Object.fromEntries(
    ALL_ROLES.map((role) => [
      CREATOR_ROLE_TO_FIELD[role],
      comic.creators.filter((c) => c.role === role).map((c) => c.creator.name),
    ])
  ) as Record<CreatorField, string[]>

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
    coverPrice:
      comic.coverPriceCents != null ? comic.coverPriceCents / 100 : null,
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
    purchasePrice:
      comic.purchasePriceCents != null ? comic.purchasePriceCents / 100 : null,
    purchasePriceCurrency: comic.purchasePriceCurrency ?? null,
    purchaseDate: comic.purchaseDate
      ? comic.purchaseDate.substring(0, 10)
      : null,
    purchasedFrom: comic.purchasedFrom ?? null,
    collectionWishlist:
      comic.collectionWishlist === 'COLLECTION' ||
      comic.collectionWishlist === 'WISHLIST'
        ? comic.collectionWishlist
        : null,
    notes: comic.notes ?? null,
    gradedBy: comic.gradedBy ?? null,
    gradedRating: comic.gradedRating ?? null,
    gradedLabelType: comic.gradedLabelType ?? null,
    gradedSerialNumber: comic.gradedSerialNumber ?? null,
    graderNotes: comic.graderNotes ?? null,
    pageQuality: comic.pageQuality ?? null,
    publisherName: comic.publisher?.name ?? null,
    seriesName: comic.series?.name ?? null,
    ...creatorsByRole,
    characters: comic.characters.map((c) => c.name),
    storyArcs: comic.storyArcs.map((a) => a.name),
    genres: comic.genres
      .filter((g) => g.type === 'GENRE')
      .map((g) => g.genre.name),
    subgenres: comic.genres
      .filter((g) => g.type === 'SUBGENRE')
      .map((g) => g.genre.name),
  }
}

function formValuesToDto(values: ComicFormValues): UpdateComicDto {
  const creators = ALL_ROLES.flatMap((role) =>
    (values[CREATOR_ROLE_TO_FIELD[role] as CreatorField] as string[]).map(
      (name) => ({ name, role })
    )
  )

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
    coverPriceCents:
      values.coverPrice != null ? Math.round(values.coverPrice * 100) : null,
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
    purchasePriceCents:
      values.purchasePrice != null
        ? Math.round(values.purchasePrice * 100)
        : null,
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
    creators,
    characters: values.characters.map((name) => ({ name })),
    storyArcs: values.storyArcs.map((name) => ({ name })),
    genres: [
      ...values.genres.map((name) => ({ name, type: 'GENRE' as const })),
      ...values.subgenres.map((name) => ({ name, type: 'SUBGENRE' as const })),
    ],
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

function getInitialVisibleRoles(vals: ComicFormValues): CreatorRole[] {
  return ALL_ROLES.filter(
    (role) =>
      (vals[CREATOR_ROLE_TO_FIELD[role] as CreatorField] as string[]).length > 0
  )
}

export function ComicDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [comic, setComic] = useState<ComicDetailDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [trackingSeries, setTrackingSeries] = useState(false)
  const [visibleRoles, setVisibleRoles] = useState<CreatorRole[]>([])
  const [roleToAdd, setRoleToAdd] = useState<string | null>(null)

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
      coverPrice: null,
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
      purchasePrice: null,
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
      creatorsWriter: [],
      creatorsArtist: [],
      creatorsPenciller: [],
      creatorsInker: [],
      creatorsColorist: [],
      creatorsCoverArtist: [],
      creatorsLetterer: [],
      creatorsEditor: [],
      creatorsCreatedBy: [],
      characters: [],
      storyArcs: [],
      genres: [],
      subgenres: [],
    },
  })

  const applyComicToForm = (data: ComicDetailDto) => {
    const vals = comicToFormValues(data)
    form.setValues(vals)
    form.resetDirty(vals)
    setVisibleRoles(getInitialVisibleRoles(vals))
  }

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getComic(parseInt(id, 10))
      .then((data) => {
        setComic(data)
        applyComicToForm(data)
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
      applyComicToForm(updated)
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
            applyComicToForm(refreshed)
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

  const handleTrackSeries = async () => {
    if (!comic?.series?.metronSeriesId) return
    setTrackingSeries(true)
    try {
      const seriesDetail = await getMetronSeriesById(
        comic.series.metronSeriesId
      )
      await createTrackedSeries({
        metronSeriesId: seriesDetail.id,
        name: seriesDetail.name,
        volume: seriesDetail.volume,
        publisher: comic.series.publisher?.name ?? null,
        yearBegan: seriesDetail.yearBegan,
        issueCount: seriesDetail.issueCount,
      })
      notifications.show({
        title: 'Series Tracked',
        message: `Now tracking "${seriesDetail.name}".`,
        color: 'green',
      })
      const refreshed = await getComic(comic.id)
      setComic(refreshed)
      applyComicToForm(refreshed)
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Failed to track series.',
        color: 'red',
      })
    } finally {
      setTrackingSeries(false)
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
        applyComicToForm(updated)
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

  const availableRolesToAdd = ROLE_OPTIONS.filter(
    (r) => !visibleRoles.includes(r.value as CreatorRole)
  )

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
        <Stack>
          <Stack w="100%">
            {/* Header */}
            <Flex gap="lg">
              <Image
                src={comic.coverImageUrl ?? placeholderImg}
                w={200}
                radius="md"
                fit="cover"
                alt={comic.title}
              />
              <Stack gap="md" w="100%">
                <Stack>
                  <Title order={4}>Title</Title>
                  <TextInput
                    size="xl"
                    fw={700}
                    placeholder="Title"
                    key={form.key('title')}
                    {...form.getInputProps('title')}
                  />
                </Stack>
                <Stack>
                  <Title order={4}>Synopsis</Title>
                  <Textarea
                    autosize
                    w="100%"
                    minRows={5}
                    placeholder="Synopsis"
                    key={form.key('synopsis')}
                    {...form.getInputProps('synopsis')}
                  />
                </Stack>
              </Stack>
            </Flex>
            <Paper withBorder p="md" radius="md">
              <Group gap="lg">
                <Stack>
                  <Title order={5}>Actions</Title>
                  <Group>
                    <CSButton
                      type="submit"
                      rightSection={<IconDeviceFloppy size={16} />}
                      loading={saving || syncing}
                      disabled={!form.isDirty()}
                    >
                      Save
                    </CSButton>
                    <CSButton
                      color="red"
                      variant="outline"
                      rightSection={<IconTrash size={16} />}
                      onClick={handleDelete}
                    >
                      Delete
                    </CSButton>
                  </Group>
                </Stack>
                <Stack>
                  <Title order={5}>Metron Actions</Title>
                  <Group wrap="wrap">
                    <CSButton
                      rightSection={<IconRefresh size={16} />}
                      onClick={handleSync}
                      loading={syncing}
                    >
                      {comic.metronId ? 'Sync' : 'Connect'}
                    </CSButton>
                    {comic.trackedSeriesMetronId && (
                      <CSButton
                        component={Link}
                        to={`/series/${comic.trackedSeriesMetronId}`}
                        rightSection={<IconLayersLinked size={16} />}
                      >
                        View Series
                      </CSButton>
                    )}
                    {comic.series?.metronSeriesId &&
                      !comic.trackedSeriesMetronId && (
                        <CSButton
                          rightSection={<IconLayersLinked size={16} />}
                          onClick={handleTrackSeries}
                          loading={trackingSeries}
                        >
                          Track Series
                        </CSButton>
                      )}
                    {comic.metronId && (
                      <CSButton
                        component="a"
                        href={`https://metron.cloud/issue/${comic.metronId}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        rightSection={<IconEye size={16} />}
                      >
                        View on Metron
                      </CSButton>
                    )}
                  </Group>
                </Stack>
              </Group>
            </Paper>
          </Stack>

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
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
                    label="Cover Price"
                    placeholder="0.00"
                    decimalScale={2}
                    fixedDecimalScale
                    prefix="$"
                    key={form.key('coverPrice')}
                    {...form.getInputProps('coverPrice')}
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
                    label="Purchase Price"
                    placeholder="0.00"
                    decimalScale={2}
                    fixedDecimalScale
                    prefix="$"
                    key={form.key('purchasePrice')}
                    {...form.getInputProps('purchasePrice')}
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
          <Paper withBorder p="md" radius="md">
            <Title order={3} mb="sm">
              Creators
            </Title>
            <Stack gap="xs">
              {visibleRoles.map((role) => (
                <TagsInputField
                  key={form.key(CREATOR_ROLE_TO_FIELD[role])}
                  label={getRoleLabel(role)}
                  placeholder="Type a name..."
                  fetchOptions={fetchCreatorNames}
                  {...form.getInputProps(CREATOR_ROLE_TO_FIELD[role])}
                />
              ))}
              {visibleRoles.length === 0 && availableRolesToAdd.length > 0 && (
                <Text size="sm" c="dimmed">
                  No creators added. Use the dropdown below to add a role.
                </Text>
              )}
              {availableRolesToAdd.length > 0 && (
                <Group gap="xs" mt={visibleRoles.length > 0 ? 'xs' : 0}>
                  <Select
                    placeholder="Add role..."
                    data={availableRolesToAdd}
                    value={roleToAdd}
                    onChange={setRoleToAdd}
                    clearable
                    w={180}
                  />
                  <CSButton
                    rightSection={<IconPlus size={14} />}
                    disabled={!roleToAdd}
                    onClick={() => {
                      if (roleToAdd) {
                        setVisibleRoles((prev) => [
                          ...prev,
                          roleToAdd as CreatorRole,
                        ])
                        setRoleToAdd(null)
                      }
                    }}
                  >
                    Add Role
                  </CSButton>
                </Group>
              )}
            </Stack>
          </Paper>

          {/* Characters */}
          <Paper withBorder p="md" radius="md">
            <Title order={3} mb="sm">
              Characters
            </Title>
            <TagsInputField
              placeholder="Type a character name..."
              fetchOptions={fetchCharacterNames}
              key={form.key('characters')}
              {...form.getInputProps('characters')}
            />
          </Paper>

          {/* Story Arcs */}
          <Paper withBorder p="md" radius="md">
            <Title order={3} mb="sm">
              Story Arcs
            </Title>
            <TagsInputField
              placeholder="Type a story arc name..."
              fetchOptions={fetchStoryArcNames}
              key={form.key('storyArcs')}
              {...form.getInputProps('storyArcs')}
            />
          </Paper>

          {/* Genres */}
          <Paper withBorder p="md" radius="md">
            <Title order={3} mb="sm">
              Genres
            </Title>
            <Stack gap="xs">
              <TagsInputField
                label="Genres"
                placeholder="Type a genre..."
                fetchOptions={fetchGenreNames}
                key={form.key('genres')}
                {...form.getInputProps('genres')}
              />
              <TagsInputField
                label="Subgenres"
                placeholder="Type a subgenre..."
                fetchOptions={fetchGenreNames}
                key={form.key('subgenres')}
                {...form.getInputProps('subgenres')}
              />
            </Stack>
          </Paper>

          {/* Grading */}
          <Paper withBorder p="md" radius="md">
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
          <Paper withBorder p="md" radius="md">
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
        </Stack>
      </form>
    </Container>
  )
}
