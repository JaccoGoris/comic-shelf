import { Link } from 'react-router-dom'
import { Card, Image, Stack, Text, Badge, Box } from '@mantine/core'
import type { RecentComicDto } from '@comic-shelf/shared-types'
import placeholderImg from '../../../assets/comic-card-placeholder.webp'
import { formatCurrency } from './formatters'

export function ComicCoverCard({
  comic,
  showPurchase,
}: {
  comic: RecentComicDto
  showPurchase?: boolean
}) {
  return (
    <Card
      component={Link}
      to={`/comics/${comic.id}`}
      withBorder
      radius="md"
      p="sm"
      style={{
        minWidth: 140,
        maxWidth: 160,
        textDecoration: 'none',
        height: 250,
      }}
    >
      <Card.Section>
        {showPurchase && comic.purchasePriceCents != null ? (
          <Box style={{ position: 'absolute', top: 8, right: 8 }}>
            <Badge size="lg" color="black">
              {formatCurrency(comic.purchasePriceCents)}
            </Badge>
          </Box>
        ) : null}
        <Image
          src={comic.coverImageUrl ?? placeholderImg}
          alt={comic.title}
          height={180}
          fit="cover"
          style={
            !comic.coverImageUrl
              ? { filter: 'contrast(30%) brightness(120%)' }
              : undefined
          }
        />
      </Card.Section>
      <Stack mt="xs" gap="2">
        <Text size="xs" fw={600} lineClamp={2}>
          {comic.title}
          {comic.issueNumber ? ` #${comic.issueNumber}` : ''}
        </Text>

        {showPurchase && comic.purchaseDate && (
          <Text size="xs" c="dimmed">
            {new Date(comic.purchaseDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
        )}
      </Stack>
    </Card>
  )
}
