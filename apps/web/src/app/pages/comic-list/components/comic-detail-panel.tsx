import { Box, ActionIcon, Group, Stack } from '@mantine/core'
import { IconExternalLink, IconX } from '@tabler/icons-react'
import { memo } from 'react'
import { ComicDetail } from '../../comic-detail'

interface ComicDetailPanelProps {
  comicId: string
  onClose: () => void
}

export const ComicDetailPanel = memo(function ComicDetailPanel({
  comicId,
  onClose,
}: ComicDetailPanelProps) {
  const toolbar = (
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
  )

  const content = (
    <Box style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
      <ComicDetail comicId={comicId} mode="panel" onClose={onClose} />
    </Box>
  )

  return (
    <>
      {/* Desktop side panel */}
      <Stack
        visibleFrom="sm"
        w={'40dvw'}
        style={{
          minWidth: '40dvw',
          height: 'calc(100dvh - var(--app-shell-header-offset, 0px))',
          borderLeft: '1px solid var(--mantine-color-default-border)',
          flexShrink: 0,
        }}
      >
        {toolbar}
        {content}
      </Stack>

      {/* Mobile fullscreen overlay */}
      <Stack
        hiddenFrom="sm"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          backgroundColor: 'var(--mantine-color-body)',
        }}
      >
        {toolbar}
        {content}
      </Stack>
    </>
  )
})
