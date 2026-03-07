import { ComicListItemDto } from '@comic-shelf/shared-types'
import { Card, Image, Group, Badge, Text } from '@mantine/core'
import placeholderImg from '../../../assets/comic-card-placeholder.webp'
import { formatPrice } from '../../../utils/format'
import { Link } from 'react-router-dom'

export function ComicCard({ comic }: { comic: ComicListItemDto }) {
  return (
    <Card
      component={Link}
      to={`/comics/${comic.id}`}
      shadow="sm"
      radius="md"
      withBorder
      p={0}
      style={{
        textDecoration: 'none',
        color: 'inherit',
        position: 'relative',
        aspectRatio: '2/3',
        overflow: 'hidden',
      }}
    >
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
            filter: ' contrast(30%) brightness(120%)',
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
          {comic.read ? (
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
      {(!comic.volume || !comic.issueNumber) && (
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
            More info needed
          </Badge>
        </Group>
      )}
    </Card>
  )
}
