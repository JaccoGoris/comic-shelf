import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Container,
  Title,
  Text,
  Button,
  SimpleGrid,
  Paper,
  Group,
  Stack,
  Skeleton,
  Alert,
  RingProgress,
  Center,
  Card,
  Image,
  ScrollArea,
  Badge,
  Box,
} from '@mantine/core'
import { BarChart, AreaChart, DonutChart } from '@mantine/charts'
import {
  IconBooks,
  IconEye,
  IconCurrencyDollar,
  IconBuildingSkyscraper,
  IconStack2,
  IconAlertCircle,
} from '@tabler/icons-react'
import { getStats } from '../../api/client'
import type { DashboardStatsDto } from '@comic-shelf/shared-types'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

function formatCurrency(cents: number): string {
  return currencyFormatter.format(cents / 100)
}

interface StatCardProps {
  label: string
  value: string
  icon: React.ReactNode
  sub?: React.ReactNode
}

function StatCard({ label, value, icon, sub }: StatCardProps) {
  return (
    <Paper withBorder p="md" radius="md">
      <Group justify="space-between" mb={4}>
        <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
          {label}
        </Text>
        {icon}
      </Group>
      <Text fw={700} size="xl">
        {value}
      </Text>
      {sub && <Text size="xs" c="dimmed" mt={4}>{sub}</Text>}
    </Paper>
  )
}

interface SectionProps {
  title: string
  children: React.ReactNode
}

interface DonutLegendItem { name: string; value: number; color: string }

function DonutLegend({ data }: { data: DonutLegendItem[] }) {
  return (
    <Group justify="center" mt="xs" gap="lg">
      {data.map((d) => (
        <Group key={d.name} gap={6}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: `var(--mantine-color-${d.color.replace('.', '-')})`,
            }}
          />
          <Text size="xs">{d.name}: {d.value}</Text>
        </Group>
      ))}
    </Group>
  )
}

function Section({ title, children }: SectionProps) {
  return (
    <Paper withBorder p="md" radius="md">
      <Text fw={600} mb="md">
        {title}
      </Text>
      {children}
    </Paper>
  )
}

export function HomePage() {
  const [stats, setStats] = useState<DashboardStatsDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getStats()
      .then((data) => { if (!cancelled) setStats(data) })
      .catch(() => { if (!cancelled) setError('Failed to load dashboard stats.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <Container size="xl" py="md">
        <Title mb="lg">Dashboard</Title>
        <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} mb="lg">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height={90} radius="md" />
          ))}
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, md: 2 }} mb="lg">
          <Skeleton height={260} radius="md" />
          <Skeleton height={260} radius="md" />
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, md: 2 }} mb="lg">
          <Skeleton height={220} radius="md" />
          <Skeleton height={220} radius="md" />
        </SimpleGrid>
      </Container>
    )
  }

  if (error) {
    return (
      <Container size="xl" py="md">
        <Alert icon={<IconAlertCircle size={16} />} color="red" title="Error">
          {error}
        </Alert>
      </Container>
    )
  }

  if (!stats) return null

  if (stats.totalComics === 0) {
    return (
      <Container size="sm" py="xl">
        <Stack align="center" gap="lg" ta="center">
          <Title order={1}>Welcome to Comic Shelf</Title>
          <Text size="lg" c="dimmed">
            Your collection is empty. Start by adding your first comic!
          </Text>
          <Button
            component={Link}
            to="/comics"
            size="lg"
            leftSection={<IconBooks size={20} />}
          >
            Add Your First Comic
          </Button>
        </Stack>
      </Container>
    )
  }

  const comicsByYearStr = stats.comicsByYear.map((d) => ({ ...d, year: String(d.year) }))

  const readUnreadData = [
    { name: 'Read', value: stats.totalRead, color: 'violet.6' },
    { name: 'Unread', value: stats.totalUnread, color: 'gray.4' },
  ]

  const collectionWishlistData = [
    { name: 'Collection', value: stats.collectionCount, color: 'violet.6' },
    { name: 'Wishlist', value: stats.wishlistCount, color: 'cyan.6' },
  ]

  return (
    <Container size="xl" py="md">
      <Title mb="lg">Dashboard</Title>

      {/* Row 1: Stat Cards */}
      <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} mb="lg">
        <StatCard
          label="Total Comics"
          value={stats.totalComics.toLocaleString()}
          icon={<IconBooks size={18} color="var(--mantine-color-violet-6)" />}
        />
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" mb={4}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
              Read
            </Text>
            <IconEye size={18} color="var(--mantine-color-violet-6)" />
          </Group>
          <Group gap="xs" align="center">
            <RingProgress
              size={54}
              thickness={5}
              sections={[{ value: stats.readPercentage, color: 'violet.6' }]}
              label={
                <Center>
                  <Text size="xs" fw={700}>
                    {stats.readPercentage}%
                  </Text>
                </Center>
              }
            />
            <Stack gap={2}>
              <Text fw={700} size="sm">{stats.totalRead} read</Text>
              <Text size="xs" c="dimmed">{stats.totalUnread} unread</Text>
            </Stack>
          </Group>
        </Paper>
        <StatCard
          label="Cover Value"
          value={formatCurrency(stats.totalCoverValueCents)}
          icon={<IconCurrencyDollar size={18} color="var(--mantine-color-violet-6)" />}
          sub={`Spent: ${formatCurrency(stats.totalPurchaseSpendCents)}`}
        />
        <StatCard
          label="Publishers"
          value={stats.publisherCount.toLocaleString()}
          icon={<IconBuildingSkyscraper size={18} color="var(--mantine-color-violet-6)" />}
        />
        <StatCard
          label="Series"
          value={stats.seriesCount.toLocaleString()}
          icon={<IconStack2 size={18} color="var(--mantine-color-violet-6)" />}
        />
      </SimpleGrid>

      {/* Row 2: Publisher & Year Charts */}
      <SimpleGrid cols={{ base: 1, md: 2 }} mb="lg">
        {stats.comicsByPublisher.length > 0 && (
          <Section title="Comics by Publisher">
            <BarChart
              h={220}
              data={stats.comicsByPublisher}
              dataKey="name"
              series={[{ name: 'count', color: 'violet.6', label: 'Comics' }]}
              orientation="horizontal"
              gridAxis="x"
              withTooltip
              barProps={{ radius: 3 }}
              tickLine="none"
            />
          </Section>
        )}
        {stats.comicsByYear.length > 0 && (
          <Section title="Comics by Year">
            <AreaChart
              h={220}
              data={comicsByYearStr}
              dataKey="year"
              series={[{ name: 'count', color: 'violet.6', label: 'Comics' }]}
              curveType="monotone"
              withTooltip
              withDots={false}
              gridAxis="xy"
            />
          </Section>
        )}
      </SimpleGrid>

      {/* Row 3: Donut Charts */}
      <SimpleGrid cols={{ base: 1, md: 2 }} mb="lg">
        {(stats.totalRead > 0 || stats.totalUnread > 0) && (
          <Section title="Read vs Unread">
            <Center>
              <DonutChart
                data={readUnreadData}
                size={180}
                thickness={30}
                withTooltip
                withLabelsLine={false}
              />
            </Center>
            <DonutLegend data={readUnreadData} />
          </Section>
        )}
        {(stats.collectionCount > 0 || stats.wishlistCount > 0) && (
          <Section title="Collection vs Wishlist">
            <Center>
              <DonutChart
                data={collectionWishlistData}
                size={180}
                thickness={30}
                withTooltip
                withLabelsLine={false}
              />
            </Center>
            <DonutLegend data={collectionWishlistData} />
          </Section>
        )}
      </SimpleGrid>

      {/* Row 4: Genres & Growth */}
      <SimpleGrid cols={{ base: 1, md: 2 }} mb="lg">
        {stats.comicsByGenre.length > 0 && (
          <Section title="Top Genres">
            <BarChart
              h={220}
              data={stats.comicsByGenre}
              dataKey="name"
              series={[{ name: 'count', color: 'violet.6', label: 'Comics' }]}
              orientation="horizontal"
              gridAxis="x"
              withTooltip
              barProps={{ radius: 3 }}
              tickLine="none"
            />
          </Section>
        )}
        {stats.comicsAddedPerMonth.length > 0 && (
          <Section title="Collection Growth (Last 12 Months)">
            <AreaChart
              h={220}
              data={stats.comicsAddedPerMonth}
              dataKey="month"
              series={[{ name: 'count', color: 'violet.6', label: 'Added' }]}
              curveType="monotone"
              withTooltip
              withDots={false}
              gridAxis="xy"
            />
          </Section>
        )}
      </SimpleGrid>

      {/* Row 5: Top Series */}
      {stats.comicsBySeries.length > 0 && (
        <Box mb="lg">
          <Section title="Top Series">
            <BarChart
              h={200}
              data={stats.comicsBySeries}
              dataKey="name"
              series={[{ name: 'count', color: 'violet.6', label: 'Comics' }]}
              orientation="horizontal"
              gridAxis="x"
              withTooltip
              barProps={{ radius: 3 }}
              tickLine="none"
            />
          </Section>
        </Box>
      )}

      {/* Row 6: Recently Added */}
      {stats.recentlyAdded.length > 0 && (
        <Paper withBorder p="md" radius="md">
          <Text fw={600} mb="md">Recently Added</Text>
          <ScrollArea>
            <Group gap="md" wrap="nowrap" pb="xs">
              {stats.recentlyAdded.map((comic) => (
                <Card
                  key={comic.id}
                  component={Link}
                  to={`/comics/${comic.id}`}
                  withBorder
                  radius="md"
                  p="sm"
                  style={{ minWidth: 140, maxWidth: 160, textDecoration: 'none' }}
                >
                  {comic.coverImageUrl ? (
                    <Card.Section>
                      <Image
                        src={comic.coverImageUrl}
                        alt={comic.title}
                        height={180}
                        fit="cover"
                      />
                    </Card.Section>
                  ) : (
                    <Center h={180} bg="var(--mantine-color-default-border)" style={{ borderRadius: 'var(--mantine-radius-md)' }}>
                      <IconBooks size={40} color="var(--mantine-color-dimmed)" />
                    </Center>
                  )}
                  <Stack gap={4} mt="xs">
                    <Text size="xs" fw={600} lineClamp={2}>
                      {comic.title}
                      {comic.issueNumber ? ` #${comic.issueNumber}` : ''}
                    </Text>
                    {comic.publisher && (
                      <Badge size="xs" variant="light" color="violet">
                        {comic.publisher}
                      </Badge>
                    )}
                  </Stack>
                </Card>
              ))}
            </Group>
          </ScrollArea>
        </Paper>
      )}
    </Container>
  )
}
