import { useState, useEffect } from 'react'
import { Modal, TextInput, Stack, Autocomplete } from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { useIsMobile } from '../hooks/use-is-mobile'
import { notifications } from '@mantine/notifications'
import { createComic, getPublishers, getSeries } from '../../api/client'
import { getErrorMessage } from '../../utils/error'
import type { PublisherDto } from '@comic-shelf/shared-types'
import { CSButton } from './cs-button'

interface CreateComicModalProps {
  opened: boolean
  onClose: () => void
  onCreated: (comicId: number) => void
}

export function CreateComicModal({
  opened,
  onClose,
  onCreated,
}: CreateComicModalProps) {
  const isMobile = useIsMobile()
  const [title, setTitle] = useState('')
  const [issueNumber, setIssueNumber] = useState('')
  const [volume, setVolume] = useState('')
  const [publisherName, setPublisherName] = useState('')
  const [seriesName, setSeriesName] = useState('')
  const [loading, setLoading] = useState(false)
  const [publisherObjects, setPublisherObjects] = useState<PublisherDto[]>([])
  const [seriesOptions, setSeriesOptions] = useState<string[]>([])
  const [debouncedPublisher] = useDebouncedValue(publisherName, 300)
  const [debouncedSeries] = useDebouncedValue(seriesName, 300)

  useEffect(() => {
    getPublishers(debouncedPublisher || undefined)
      .then(setPublisherObjects)
      .catch(() => {
        console.debug('Failed to fetch publishers for autocomplete, ignoring')
      })
  }, [debouncedPublisher])

  useEffect(() => {
    const matchedPublisher = publisherObjects.find(
      (p) => p.name.toLowerCase() === publisherName.toLowerCase()
    )
    getSeries(debouncedSeries || undefined, matchedPublisher?.id)
      .then((series) =>
        setSeriesOptions([...new Set(series.map((s) => s.name))])
      )
      .catch(() => {
        console.debug('Failed to fetch series for autocomplete, ignoring')
      })
  }, [debouncedSeries, publisherObjects, publisherName])

  const reset = () => {
    setTitle('')
    setIssueNumber('')
    setVolume('')
    setPublisherName('')
    setSeriesName('')
    setPublisherObjects([])
    setSeriesOptions([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setLoading(true)
    try {
      const comic = await createComic({
        title: title.trim(),
        issueNumber: issueNumber.trim() || null,
        volume: volume.trim() || null,
        publisher: publisherName.trim() ? { name: publisherName.trim() } : null,
        series: seriesName.trim() ? { name: seriesName.trim() } : null,
      })
      notifications.show({
        title: 'Comic Created',
        message: `"${comic.title}" has been added to your collection.`,
        color: 'green',
      })
      reset()
      onClose()
      onCreated(comic.id)
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: getErrorMessage(err, 'Failed to create comic.'),
        color: 'red',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Add Comic"
      size="lg"
      centered
      fullScreen={isMobile}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="sm">
          <TextInput
            label="Title"
            placeholder="e.g. Amazing Spider-Man"
            value={title}
            onChange={(e) => setTitle(e.currentTarget.value)}
            required
            data-autofocus
          />
          <TextInput
            label="Issue Number"
            placeholder="e.g. 1"
            value={issueNumber}
            onChange={(e) => setIssueNumber(e.currentTarget.value)}
          />
          <TextInput
            label="Volume"
            placeholder="e.g. 1"
            value={volume}
            onChange={(e) => setVolume(e.currentTarget.value)}
          />
          <Autocomplete
            label="Publisher"
            placeholder="e.g. Marvel Comics"
            value={publisherName}
            onChange={setPublisherName}
            data={[...new Set(publisherObjects.map((p) => p.name))]}
          />
          <Autocomplete
            label="Series"
            placeholder="e.g. Amazing Spider-Man"
            value={seriesName}
            onChange={setSeriesName}
            data={seriesOptions}
          />
          <CSButton
            type="submit"
            loading={loading}
            mt="lg"
            disabled={!title.trim()}
          >
            Add Comic
          </CSButton>
        </Stack>
      </form>
    </Modal>
  )
}
