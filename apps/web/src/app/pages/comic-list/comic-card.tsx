import { ComicListItemDto } from '@comic-shelf/shared-types'
import { Card, Image, Group, Badge, Text, ActionIcon } from '@mantine/core'
import { IconPlus } from '@tabler/icons-react'
import placeholderImg from '../../../assets/comic-card-placeholder.webp'
import { formatPrice } from '../../../utils/format'
import { Link } from 'react-router-dom'

interface ComicCardProps {
  comic: ComicListItemDto
  onAcquire?: (id: number) => void
  acquiring?: boolean
  onSelect?: (id: number) => void
  selected?: boolean
}

export function ComicCard({ comic, onAcquire, acquiring, onSelect, selected }: ComicCardProps) {
  const isMissing = comic.collectionWishlist === 'MISSING'

  const baseStyle = {
    textDecoration: 'none',
    color: 'inherit',
    position: 'relative' as const,
    aspectRatio: '2/3',
    overflow: 'hidden',
  }

  const innerContent = (
    <>
      {comic.coverImageUrl ? (
        <Image
          src={comic.coverImageUrl}
          fit="cover"
          alt={comic.title}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectPosition: 'center',
            filter: isMissing ? 'grayscale(100%) opacity(0.5)' : undefined,
          }}
        />
      ) : (
        <Image
          src={placeholderImg}
          fit="cover"
          alt="No cover available"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectPosition: 'center',
            filter: isMissing
              ? 'grayscale(100%) opacity(0.5)'
              : ' contrast(30%) brightness(120%)',
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 'var(--mantine-spacing-md)',
          background:
            'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.95) 100%)',
        }}
      >
        <Group justify="space-between" mb="xs">
          <Badge color="violet" size="md">
            #{comic.issueNumber ?? '—'}
          </Badge>
          {isMissing ? (
            <Badge color="orange" size="md">
              Missing
            </Badge>
          ) : comic.read ? (
            <Badge color="green" size="md">
              Read
            </Badge>
          ) : (
            <Badge color="red" size="md">
              Unread
            </Badge>
          )}
        </Group>
        <Text fw={600} lineClamp={2} size="sm" c="white">
          {comic.title}
        </Text>

        <Group mt="xs" gap="xs" wrap="wrap" justify="space-between">
          {comic.year && (
            <Text size="xs" c="gray.4">
              {comic.year}
            </Text>
          )}
          <Text size="xs" c="gray.4">
            {formatPrice(comic.coverPriceCents, comic.coverPriceCurrency) ??
              '—'}
          </Text>
        </Group>
      </div>
      {(!comic.volume || !comic.issueNumber) && !isMissing && (
        <Group
          justify="center"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            padding: 'var(--mantine-spacing-sm)',
          }}
        >
          <Badge color="orange" size="xs" mb="xs">
            More info required
          </Badge>
        </Group>
      )}
      {isMissing && onAcquire && (
        <ActionIcon
          size="md"
          color="violet"
          variant="filled"
          radius="xl"
          style={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onAcquire(comic.id)
          }}
          loading={acquiring}
          aria-label="Acquire this issue"
        >
          <IconPlus size={14} />
        </ActionIcon>
      )}
    </>
  )

  if (onSelect) {
    return (
      <Card
        component="div"
        shadow="sm"
        radius="md"
        withBorder
        p={0}
        onClick={() => onSelect(comic.id)}
        style={{
          ...baseStyle,
          cursor: 'pointer',
          borderLeft: selected
            ? '4px solid var(--mantine-color-violet-6)'
            : undefined,
        }}
      >
        {innerContent}
      </Card>
    )
  }

  return (
    <Card
      component={Link}
      to={`/comics/${comic.id}`}
      shadow="sm"
      radius="md"
      withBorder
      p={0}
      style={baseStyle}
    >
      {innerContent}
    </Card>
  )
}
