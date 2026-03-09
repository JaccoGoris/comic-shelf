import { useState } from 'react'
import { exportBackup, importBackup } from '../../api/client'
import type { BackupImportResultDto } from '@comic-shelf/shared-types'
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
  Divider,
} from '@mantine/core'
import { Dropzone } from '@mantine/dropzone'
import { notifications } from '@mantine/notifications'
import {
  IconUpload,
  IconFile,
  IconX,
  IconCheck,
  IconAlertCircle,
  IconDownload,
} from '@tabler/icons-react'

export function BackupPage() {
  const [exporting, setExporting] = useState(false)

  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<BackupImportResultDto | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportBackup()
      notifications.show({
        title: 'Export complete',
        message: 'Your backup file has been downloaded.',
        color: 'green',
        icon: <IconCheck size={16} />,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed.'
      notifications.show({
        title: 'Export failed',
        message,
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      })
    } finally {
      setExporting(false)
    }
  }

  const handleImport = async () => {
    if (!file) return

    setImporting(true)
    setResult(null)
    setImportError(null)

    try {
      const res = await importBackup(file)
      setResult(res)
      notifications.show({
        title: 'Restore complete',
        message: `${res.created} created, ${res.updated} updated.`,
        color: 'green',
        icon: <IconCheck size={16} />,
      })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Restore failed. Check the console.'
      setImportError(message)
      notifications.show({
        title: 'Restore failed',
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
        Backup &amp; Restore
      </Title>
      <Text c="dimmed" mb="xl">
        Export your entire collection as a JSON file and restore it on any Comic
        Shelf instance. Importing is safe to run multiple times — existing comics
        (by Item ID) will be updated, new ones will be created.
      </Text>

      <Title order={3} mb="sm">
        Export
      </Title>
      <Text c="dimmed" mb="md">
        Download a full backup of your collection including all relations
        (publisher, series, creators, characters, story arcs, genres).
      </Text>
      <Button
        onClick={handleExport}
        loading={exporting}
        leftSection={<IconDownload size={16} />}
        size="md"
      >
        {exporting ? 'Exporting...' : 'Download Backup'}
      </Button>

      <Divider my="xl" />

      <Title order={3} mb="sm">
        Restore
      </Title>
      <Text c="dimmed" mb="md">
        Upload a backup JSON file to restore your collection.
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
              {file ? file.name : 'Drag a backup JSON file here or click to select'}
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
        onClick={handleImport}
        loading={importing}
        disabled={!file}
        fullWidth
        size="md"
      >
        {importing ? 'Restoring...' : 'Restore from Backup'}
      </Button>

      {result && (
        <Alert
          icon={<IconCheck size={16} />}
          title="Restore Complete"
          color="green"
          mt="lg"
        >
          <Stack gap="xs">
            <List size="sm">
              <List.Item>
                <strong>{result.created}</strong> comics created
              </List.Item>
              <List.Item>
                <strong>{result.updated}</strong> comics updated
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

      {importError && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Restore Failed"
          color="red"
          mt="lg"
        >
          {importError}
        </Alert>
      )}
    </Container>
  )
}
