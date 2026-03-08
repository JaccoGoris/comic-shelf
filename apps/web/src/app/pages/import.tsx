import { useState } from 'react'
import { importComics } from '../../api/client'
import type { ImportResultDto } from '@comic-shelf/shared-types'
import {
  Container,
  Title,
  Text,
  Button,
  Alert,
  Stack,
  List,
  Spoiler,
  Group,
} from '@mantine/core'
import { Dropzone } from '@mantine/dropzone'
import { notifications } from '@mantine/notifications'
import {
  IconUpload,
  IconFile,
  IconX,
  IconCheck,
  IconAlertCircle,
} from '@tabler/icons-react'

export function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResultDto | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!file) return

    setImporting(true)
    setResult(null)
    setError(null)

    try {
      const res = await importComics(file)
      setResult(res)
      notifications.show({
        title: 'Import complete',
        message: `${res.imported} comics imported, ${res.skipped} skipped.`,
        color: 'green',
        icon: <IconCheck size={16} />,
      })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Import failed. Check the console.'
      setError(message)
      notifications.show({
        title: 'Import failed',
        message,
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      })
    } finally {
      setImporting(false)
    }
  }

  return (
    <Container size="sm" py="md">
      <Title order={1} mb="sm">
        Import Comics
      </Title>
      <Text c="dimmed" mb="lg">
        Upload a JSON file exported from your comic tracking app. The file
        should contain an array of comic objects. Duplicates (by Item Id) will
        be skipped automatically.
      </Text>

      <Dropzone
        onDrop={(files) => setFile(files[0])}
        onReject={() =>
          notifications.show({
            title: 'Invalid file',
            message: 'Please upload a .json file.',
            color: 'red',
          })
        }
        maxSize={100 * 1024 * 1024}
        accept={['application/json']}
        multiple={false}
        loading={importing}
        mb="md"
      >
        <Group
          justify="center"
          gap="xl"
          mih={140}
          style={{ pointerEvents: 'none' }}
        >
          <Dropzone.Accept>
            <IconUpload size={52} stroke={1.5} />
          </Dropzone.Accept>
          <Dropzone.Reject>
            <IconX size={52} stroke={1.5} />
          </Dropzone.Reject>
          <Dropzone.Idle>
            <IconFile size={52} stroke={1.5} />
          </Dropzone.Idle>

          <div>
            <Text size="xl" inline>
              {file ? file.name : 'Drag a JSON file here or click to select'}
            </Text>
            <Text size="sm" c="dimmed" inline mt={7}>
              {file
                ? `${(file.size / 1024).toFixed(1)} KB`
                : 'File should not exceed 100 MB'}
            </Text>
          </div>
        </Group>
      </Dropzone>

      <Button
        onClick={handleSubmit}
        loading={importing}
        disabled={!file}
        fullWidth
        size="md"
      >
        {importing ? 'Importing...' : 'Import'}
      </Button>

      {result && (
        <Alert
          icon={<IconCheck size={16} />}
          title="Import Complete"
          color="green"
          mt="lg"
        >
          <Stack gap="xs">
            <List size="sm">
              <List.Item>
                <strong>{result.imported}</strong> comics imported
              </List.Item>
              <List.Item>
                <strong>{result.skipped}</strong> skipped (duplicates or
                invalid)
              </List.Item>
              {result.errors.length > 0 && (
                <List.Item>
                  <strong>{result.errors.length}</strong> errors
                </List.Item>
              )}
            </List>
            {result.errors.length > 0 && (
              <Spoiler
                maxHeight={0}
                showLabel="Show errors"
                hideLabel="Hide errors"
              >
                <List size="xs" c="red" mt="xs">
                  {result.errors.map((err, i) => (
                    <List.Item key={i}>{err}</List.Item>
                  ))}
                </List>
              </Spoiler>
            )}
          </Stack>
        </Alert>
      )}

      {error && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Import Failed"
          color="red"
          mt="lg"
        >
          {error}
        </Alert>
      )}
    </Container>
  )
}
