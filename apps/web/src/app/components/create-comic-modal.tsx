import { useState } from 'react'
import { Modal, TextInput, NumberInput, Button, Stack } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { createComic } from '../../api/client'
import { getErrorMessage } from '../../utils/error'

interface CreateComicModalProps {
  opened: boolean
  onClose: () => void
  onCreated: (comicId: number) => void
}

export function CreateComicModal({ opened, onClose, onCreated }: CreateComicModalProps) {
  const [title, setTitle] = useState('')
  const [issueNumber, setIssueNumber] = useState('')
  const [volume, setVolume] = useState('')
  const [publisherName, setPublisherName] = useState('')
  const [seriesName, setSeriesName] = useState('')
  const [loading, setLoading] = useState(false)

  const reset = () => {
    setTitle('')
    setIssueNumber('')
    setVolume('')
    setPublisherName('')
    setSeriesName('')
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
    <Modal opened={opened} onClose={handleClose} title="Create Comic" size="md">
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
          <TextInput
            label="Publisher"
            placeholder="e.g. Marvel Comics"
            value={publisherName}
            onChange={(e) => setPublisherName(e.currentTarget.value)}
          />
          <TextInput
            label="Series"
            placeholder="e.g. Amazing Spider-Man"
            value={seriesName}
            onChange={(e) => setSeriesName(e.currentTarget.value)}
          />
          <Button type="submit" loading={loading} mt="sm" disabled={!title.trim()}>
            Create Comic
          </Button>
        </Stack>
      </form>
    </Modal>
  )
}
