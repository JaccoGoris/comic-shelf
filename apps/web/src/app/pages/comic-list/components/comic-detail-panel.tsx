import { Box, ActionIcon, Group, Stack } from '@mantine/core'
import { IconExternalLink, IconX } from '@tabler/icons-react'
import { memo, useState, useRef, useCallback, useEffect } from 'react'
import { ComicDetail } from '../../comic-detail'
import classes from './comic-detail-panel.module.css'

const STORAGE_KEY = 'comic-panel-width'
const DEFAULT_WIDTH = 500
const MIN_WIDTH = 350
const MAX_WIDTH = 800

function getInitialWidth(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = parseInt(stored, 10)
      if (!isNaN(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
        return parsed
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_WIDTH
}

interface ComicDetailPanelProps {
  comicId: string
  onClose: () => void
}

export const ComicDetailPanel = memo(function ComicDetailPanel({
  comicId,
  onClose,
}: ComicDetailPanelProps) {
  const [panelWidth, setPanelWidth] = useState<number>(getInitialWidth)
  const panelRef = useRef<HTMLDivElement>(null)
  const handleLineRef = useRef<HTMLDivElement>(null)
  const dragStartX = useRef<number>(0)
  const dragStartWidth = useRef<number>(0)
  const isDraggingRef = useRef(false)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      dragStartX.current = e.clientX
      dragStartWidth.current = panelWidth
      isDraggingRef.current = true
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'col-resize'
      if (handleLineRef.current) {
        handleLineRef.current.style.backgroundColor =
          'var(--mantine-color-violet-6)'
      }
    },
    [panelWidth],
  )

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !panelRef.current) return
      const delta = dragStartX.current - e.clientX
      const newWidth = Math.min(
        MAX_WIDTH,
        Math.max(MIN_WIDTH, dragStartWidth.current + delta),
      )
      panelRef.current.style.width = `${newWidth}px`
      panelRef.current.style.minWidth = `${newWidth}px`
    }

    const handleMouseUp = () => {
      if (!isDraggingRef.current) return
      isDraggingRef.current = false
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      if (handleLineRef.current) {
        handleLineRef.current.style.backgroundColor = ''
      }
      if (panelRef.current) {
        const newWidth = parseInt(panelRef.current.style.width, 10)
        if (!isNaN(newWidth)) {
          setPanelWidth(newWidth)
          try {
            localStorage.setItem(STORAGE_KEY, String(newWidth))
          } catch {
            // ignore
          }
        }
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

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
        ref={panelRef}
        style={{
          position: 'relative',
          width: panelWidth,
          minWidth: panelWidth,
          height: 'calc(100dvh - var(--app-shell-header-offset, 0px))',
          borderLeft: '1px solid var(--mantine-color-default-border)',
          flexShrink: 0,
        }}
      >
        {/* Drag handle */}
        <Box
          onMouseDown={handleMouseDown}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 6,
            cursor: 'col-resize',
            zIndex: 10,
          }}
          className={classes.dragHandle}
        >
          <Box
            ref={handleLineRef}
            style={{
              position: 'absolute',
              left: 2,
              top: 0,
              bottom: 0,
              width: 2,
              transition: 'background-color 0.15s',
            }}
            className={classes.dragHandleLine}
          />
        </Box>

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
