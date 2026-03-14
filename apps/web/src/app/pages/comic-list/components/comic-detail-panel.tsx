import { Box, ActionIcon, Group } from '@mantine/core'
import { IconExternalLink, IconX } from '@tabler/icons-react'
import { ComicDetail } from '../../comic-detail'

interface ComicDetailPanelProps {
  comicId: string
  onClose: () => void
}

export function ComicDetailPanel({ comicId, onClose }: ComicDetailPanelProps) {
  return (
    <Box
      w={640}
      style={{
        minWidth: 400,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid var(--mantine-color-default-border)',
        flexShrink: 0,
      }}
    >
      <Group
        p="xs"
        justify="flex-end"
        style={{
          borderBottom: '1px solid var(--mantine-color-default-border)',
          flexShrink: 0,
        }}
      >
        <ActionIcon
          variant="subtle"
          onClick={() => window.open(`/comics/${comicId}`, '_blank')}
          aria-label="Open full screen"
        >
          <IconExternalLink size={16} />
        </ActionIcon>
        <ActionIcon variant="subtle" onClick={onClose} aria-label="Close panel">
          <IconX size={16} />
        </ActionIcon>
      </Group>
      <Box style={{ flex: 1, overflowY: 'auto' }}>
        <ComicDetail comicId={comicId} mode="panel" onClose={onClose} />
      </Box>
    </Box>
  )
}
