import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Container,
  Title,
  Text,
  Tabs,
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
  IconDatabase,
  IconUsers,
} from '@tabler/icons-react'
import { exportBackup, importBackup, importComics } from '../../api/client'
import { useAuth } from '../../auth/auth-context'
import { UsersPage } from './users'
import { CSButton } from '../components/cs-button'
import type {
  BackupImportResultDto,
  ImportResultDto,
} from '@comic-shelf/shared-types'

export function SettingsPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'data'

  const handleTabChange = (value: string | null) => {
    if (value) {
      setSearchParams({ tab: value })
    }
  }

  return (
    <Container size="md" py="md">
      <Title order={1} mb="lg">
        Settings
      </Title>

      <Tabs value={activeTab} onChange={handleTabChange}>
        <Tabs.List>
          <Tabs.Tab value="data" leftSection={<IconDatabase size={16} />}>
            Data Management
          </Tabs.Tab>
          {user?.role === 'ADMIN' && (
            <Tabs.Tab value="users" leftSection={<IconUsers size={16} />}>
              Users
            </Tabs.Tab>
          )}
        </Tabs.List>

        <Tabs.Panel value="data" pt="lg">
          <DataManagementTab />
        </Tabs.Panel>

        {user?.role === 'ADMIN' && (
          <Tabs.Panel value="users" pt="lg">
            <UsersPage />
          </Tabs.Panel>
        )}
      </Tabs>
    </Container>
  )
}

function DataManagementTab() {
  // Backup export state
  const [exporting, setExporting] = useState(false)

  // Backup restore state
  const [backupFile, setBackupFile] = useState<File | null>(null)
  const [restoring, setRestoring] = useState(false)
  const [restoreResult, setRestoreResult] =
    useState<BackupImportResultDto | null>(null)
  const [restoreError, setRestoreError] = useState<string | null>(null)

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResultDto | null>(null)
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

  const handleRestore = async () => {
    if (!backupFile) return
    setRestoring(true)
    setRestoreResult(null)
    setRestoreError(null)
    try {
      const res = await importBackup(backupFile)
      setRestoreResult(res)
      notifications.show({
        title: 'Restore complete',
        message: `${res.created} created, ${res.updated} updated.`,
        color: 'green',
        icon: <IconCheck size={16} />,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Restore failed.'
      setRestoreError(message)
      notifications.show({
        title: 'Restore failed',
        message,
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      })
    } finally {
      setRestoring(false)
    }
  }

  const handleImport = async () => {
    if (!importFile) return
    setImporting(true)
    setImportResult(null)
    setImportError(null)
    try {
      const res = await importComics(importFile)
      setImportResult(res)
      notifications.show({
        title: 'Import complete',
        message: `${res.imported} comics imported, ${res.skipped} skipped.`,
        color: 'green',
        icon: <IconCheck size={16} />,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed.'
      setImportError(message)
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
    <Stack gap="lg">
      {/* Export Section */}
      <Stack>
        <Title order={3} mb="sm">
          Export Backup
        </Title>
        <Group wrap="nowrap" gap="lg" align="flex-start">
          <Text c="dimmed" mb="md">
            Download a full backup of your collection including all relations
            (publisher, series, creators, characters, story arcs, genres).
          </Text>
          <CSButton
            miw={200}
            onClick={handleExport}
            loading={exporting}
            rightSection={<IconDownload size={16} />}
          >
            {exporting ? 'Exporting...' : 'Download Backup'}
          </CSButton>
        </Group>
      </Stack>

      <Divider />

      {/* Restore Section */}
      <div>
        <Title order={3} mb="sm">
          Restore from Backup
        </Title>
        <Text c="dimmed" mb="md">
          Upload a backup JSON file to restore your collection. Existing comics
          (by Item ID) will be updated, new ones will be created.
        </Text>

        <Dropzone
          onDrop={(files) => setBackupFile(files[0])}
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
          loading={restoring}
          mb="md"
        >
          <Group
            justify="center"
            gap="xl"
            mih={120}
            style={{ pointerEvents: 'none' }}
          >
            <Dropzone.Accept>
              <IconUpload size={42} stroke={1.5} />
            </Dropzone.Accept>
            <Dropzone.Reject>
              <IconX size={42} stroke={1.5} />
            </Dropzone.Reject>
            <Dropzone.Idle>
              <IconFile size={42} stroke={1.5} />
            </Dropzone.Idle>
            <div>
              <Text size="lg" inline>
                {backupFile
                  ? backupFile.name
                  : 'Drag a backup JSON file here or click to select'}
              </Text>
              <Text size="sm" c="dimmed" inline mt={7}>
                {backupFile
                  ? `${(backupFile.size / 1024).toFixed(1)} KB`
                  : 'File should not exceed 100 MB'}
              </Text>
            </div>
          </Group>
        </Dropzone>

        <CSButton
          onClick={handleRestore}
          loading={restoring}
          disabled={!backupFile}
          fullWidth
          size="md"
        >
          {restoring ? 'Restoring...' : 'Restore from Backup'}
        </CSButton>

        {restoreResult && (
          <Alert
            icon={<IconCheck size={16} />}
            title="Restore Complete"
            color="green"
            mt="md"
          >
            <Stack gap="xs">
              <List size="sm">
                <List.Item>
                  <strong>{restoreResult.created}</strong> comics created
                </List.Item>
                <List.Item>
                  <strong>{restoreResult.updated}</strong> comics updated
                </List.Item>
                {restoreResult.errors.length > 0 && (
                  <List.Item>
                    <strong>{restoreResult.errors.length}</strong> errors
                  </List.Item>
                )}
              </List>
              {restoreResult.errors.length > 0 && (
                <Spoiler
                  maxHeight={0}
                  showLabel="Show errors"
                  hideLabel="Hide errors"
                >
                  <List size="xs" c="red" mt="xs">
                    {restoreResult.errors.map((err, i) => (
                      <List.Item key={i}>{err}</List.Item>
                    ))}
                  </List>
                </Spoiler>
              )}
            </Stack>
          </Alert>
        )}

        {restoreError && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="Restore Failed"
            color="red"
            mt="md"
          >
            {restoreError}
          </Alert>
        )}
      </div>

      <Divider />

      {/* Import Section */}
      <div>
        <Title order={3} mb="sm">
          Import Comics
        </Title>
        <Text c="dimmed" mb="md">
          Upload a JSON file exported from your comic tracking app. The file
          should contain an array of comic objects. Duplicates (by Item Id) will
          be skipped automatically.
        </Text>

        <Dropzone
          onDrop={(files) => setImportFile(files[0])}
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
            mih={120}
            style={{ pointerEvents: 'none' }}
          >
            <Dropzone.Accept>
              <IconUpload size={42} stroke={1.5} />
            </Dropzone.Accept>
            <Dropzone.Reject>
              <IconX size={42} stroke={1.5} />
            </Dropzone.Reject>
            <Dropzone.Idle>
              <IconFile size={42} stroke={1.5} />
            </Dropzone.Idle>
            <div>
              <Text size="lg" inline>
                {importFile
                  ? importFile.name
                  : 'Drag a JSON file here or click to select'}
              </Text>
              <Text size="sm" c="dimmed" inline mt={7}>
                {importFile
                  ? `${(importFile.size / 1024).toFixed(1)} KB`
                  : 'File should not exceed 100 MB'}
              </Text>
            </div>
          </Group>
        </Dropzone>

        <CSButton
          onClick={handleImport}
          loading={importing}
          disabled={!importFile}
          fullWidth
          size="md"
        >
          {importing ? 'Importing...' : 'Import'}
        </CSButton>

        {importResult && (
          <Alert
            icon={<IconCheck size={16} />}
            title="Import Complete"
            color="green"
            mt="md"
          >
            <Stack gap="xs">
              <List size="sm">
                <List.Item>
                  <strong>{importResult.imported}</strong> comics imported
                </List.Item>
                <List.Item>
                  <strong>{importResult.skipped}</strong> skipped (duplicates or
                  invalid)
                </List.Item>
                {importResult.errors.length > 0 && (
                  <List.Item>
                    <strong>{importResult.errors.length}</strong> errors
                  </List.Item>
                )}
              </List>
              {importResult.errors.length > 0 && (
                <Spoiler
                  maxHeight={0}
                  showLabel="Show errors"
                  hideLabel="Hide errors"
                >
                  <List size="xs" c="red" mt="xs">
                    {importResult.errors.map((err, i) => (
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
            title="Import Failed"
            color="red"
            mt="md"
          >
            {importError}
          </Alert>
        )}
      </div>
    </Stack>
  )
}
