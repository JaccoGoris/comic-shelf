import { useState, useEffect } from 'react'
import {
  Title,
  Table,
  ActionIcon,
  Group,
  Badge,
  Modal,
  TextInput,
  PasswordInput,
  Select,
  Stack,
  Alert,
  Skeleton,
  Text,
} from '@mantine/core'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { IconTrash, IconPlus, IconAlertCircle } from '@tabler/icons-react'
import { getUsers, createUser, deleteUser } from '../../api/client'
import { useAuth } from '../../auth/auth-context'
import type { UserDto, UserRole } from '@comic-shelf/shared-types'
import { CSButton } from '../components/cs-button'

export function UsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<UserDto[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState<UserRole>('USER')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadUsers = async () => {
    try {
      const data = await getUsers()
      setUsers(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setCreating(true)
    try {
      await createUser({
        username: newUsername,
        password: newPassword,
        role: newRole,
      })
      notifications.show({ message: 'User created', color: 'green' })
      setModalOpen(false)
      setNewUsername('')
      setNewPassword('')
      setNewRole('USER')
      loadUsers()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create user')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = (user: UserDto) => {
    modals.openConfirmModal({
      title: 'Delete User',
      children: (
        <Text size="sm">
          Are you sure you want to delete <strong>{user.username}</strong>? This
          cannot be undone.
        </Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await deleteUser(user.id)
          notifications.show({ message: 'User deleted', color: 'green' })
          loadUsers()
        } catch (err: any) {
          notifications.show({
            message: err?.response?.data?.message || 'Failed to delete user',
            color: 'red',
          })
        }
      },
    })
  }

  return (
    <>
      <Group justify="space-between" mb="md">
        <Title order={2}>Users</Title>
        <CSButton
          rightSection={<IconPlus size={16} />}
          onClick={() => setModalOpen(true)}
        >
          Add User
        </CSButton>
      </Group>

      {loading ? (
        <Stack gap="xs">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} height={40} />
          ))}
        </Stack>
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Username</Table.Th>
              <Table.Th>Role</Table.Th>
              <Table.Th>Created</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {users.map((u) => (
              <Table.Tr key={u.id}>
                <Table.Td>{u.username}</Table.Td>
                <Table.Td>
                  <Badge color={u.role === 'ADMIN' ? 'violet' : 'gray'}>
                    {u.role}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  {new Date(u.createdAt).toLocaleDateString()}
                </Table.Td>
                <Table.Td>
                  <ActionIcon
                    color="red"
                    variant="subtle"
                    disabled={u.id === currentUser?.id}
                    onClick={() => handleDelete(u)}
                    aria-label="Delete user"
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      <Modal
        opened={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setError(null)
          setNewUsername('')
          setNewPassword('')
          setNewRole('USER')
        }}
        title="Add User"
      >
        <form onSubmit={handleCreate}>
          <Stack gap="sm">
            {error && (
              <Alert icon={<IconAlertCircle size={16} />} color="red">
                {error}
              </Alert>
            )}
            <TextInput
              label="Username"
              value={newUsername}
              onChange={(e) => setNewUsername(e.currentTarget.value)}
              required
              autoFocus
            />
            <PasswordInput
              label="Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.currentTarget.value)}
              required
            />
            <Select
              label="Role"
              data={[
                { value: 'USER', label: 'User' },
                { value: 'ADMIN', label: 'Admin' },
              ]}
              value={newRole}
              onChange={(v) => setNewRole((v as UserRole) || 'USER')}
            />
            <Group justify="flex-end" mt="xs">
              <CSButton variant="default" onClick={() => setModalOpen(false)}>
                Cancel
              </CSButton>
              <CSButton type="submit" loading={creating}>
                Create
              </CSButton>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  )
}
