import { useState, useEffect, useMemo } from 'react'
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
  Alert,
  RingProgress,
  Center,
  Box,
  ScrollArea,
} from '@mantine/core'
import {
  BarChart,
  AreaChart,
  DonutChart,
  CompositeChart,
  RadarChart,
} from '@mantine/charts'
import {
  IconBooks,
  IconEye,
  IconCurrencyDollar,
  IconBuildingSkyscraper,
  IconStack2,
  IconAlertCircle,
  IconFileText,
  IconUsers,
  IconStarFilled,
  IconShield,
  IconSignature,
  IconShoppingCart,
  IconPigMoney,
  IconTag,
} from '@tabler/icons-react'
import { getStats } from '../../../api/client'
import type { DashboardStatsDto } from '@comic-shelf/shared-types'
import { formatCurrency, formatNumber } from './formatters'
import { StatCard } from './stat-card'
import { DonutLegend } from './donut-legend'
import type { DonutLegendItem } from './donut-legend'
import { MiniInsightCard } from './mini-insight-card'
import { ComicCoverCard } from './comic-cover-card'
import { DashboardSkeleton } from './dashboard-skeleton'

// ─── Main page ────────────────────────────────────────────

export function HomePage() {
  const [stats, setStats] = useState<DashboardStatsDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getStats()
      .then((data) => {
        if (!cancelled) setStats(data)
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load dashboard stats.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <DashboardSkeleton />

  if (error) {
    return (
      <Container size="xl" py="xl">
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

  return <DashboardContent stats={stats} />
}

// ─── Dashboard Content (split out to keep hooks rules clean) ─

function DashboardContent({ stats }: { stats: DashboardStatsDto }) {
  const comicsByYearStr = useMemo(
    () => stats.comicsByYear.map((d) => ({ ...d, year: String(d.year) })),
    [stats.comicsByYear]
  )

  const readUnreadData = useMemo<DonutLegendItem[]>(
    () => [
      { name: 'Read', value: stats.totalRead, color: 'violet.6' },
      { name: 'Unread', value: stats.totalUnread, color: 'gray.4' },
    ],
    [stats.totalRead, stats.totalUnread]
  )

  const TYPE_COLORS = [
    'violet.6',
    'violet.4',
    'violet.8',
    'violet.3',
    'violet.9',
  ] as const

  const comicsByTypeData = useMemo<DonutLegendItem[]>(
    () =>
      stats.comicsByType.map((d, i) => ({
        name: d.name,
        value: d.count,
        color: TYPE_COLORS[i % TYPE_COLORS.length],
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stats.comicsByType]
  )

  const radarEraData = useMemo(
    () =>
      stats.comicsByEra.map((d) => ({
        subject: d.name,
        count: d.count,
      })),
    [stats.comicsByEra]
  )

  const spendingChartData = useMemo(
    () =>
      stats.spendingByMonth.map((d) => ({
        month: d.month,
        Spent: Math.round(d.spentCents / 100),
        'Cover Value': Math.round(d.coverCents / 100),
      })),
    [stats.spendingByMonth]
  )

  const savings = stats.totalSavingsCents
  const savingsFormatted = formatCurrency(Math.abs(savings))
  const savingsColor = savings >= 0 ? 'teal' : 'red'

  return (
    <Container size="xl" py="xl">
      <Title mb="lg">Dashboard</Title>

      {/* ── Section 1: Hero Stats ── */}
      <SimpleGrid cols={{ base: 2, sm: 3, md: 6 }} mb="xl">
        <StatCard
          label="Total Comics"
          value={formatNumber(stats.totalComics)}
          icon={<IconBooks size={18} color="var(--mantine-color-violet-6)" />}
          sparklineData={stats.monthlyGrowthSparkline}
          sub={`${stats.seriesCount} series`}
        />

        {/* Read Progress with ring */}
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
              <Text fw={700} size="sm">
                {stats.totalRead} read
              </Text>
              <Text size="xs" c="dimmed">
                {stats.totalUnread} unread
              </Text>
            </Stack>
          </Group>
        </Paper>

        <StatCard
          label="Cover Value"
          value={formatCurrency(stats.totalCoverValueCents)}
          icon={
            <IconCurrencyDollar
              size={18}
              color="var(--mantine-color-violet-6)"
            />
          }
          sub={`Spent: ${formatCurrency(stats.totalPurchaseSpendCents)}`}
        />

        <StatCard
          label="Total Spent"
          value={formatCurrency(stats.totalPurchaseSpendCents)}
          icon={
            <IconShoppingCart size={18} color="var(--mantine-color-violet-6)" />
          }
          sparklineData={stats.monthlySpendSparkline}
        />

        <StatCard
          label="Savings"
          value={`${savings >= 0 ? '+' : '-'}${savingsFormatted}`}
          valueColor={savingsColor}
          icon={
            <IconPigMoney
              size={18}
              color={`var(--mantine-color-${savingsColor}-6)`}
            />
          }
          sub="cover value vs paid"
        />

        <StatCard
          label="Total Pages"
          value={formatNumber(stats.totalPages)}
          icon={
            <IconFileText size={18} color="var(--mantine-color-violet-6)" />
          }
          sub={`across ${formatNumber(stats.totalComics)} comics`}
        />
      </SimpleGrid>

      {/* ── Section 2: Collection Composition ── */}
      <Paper withBorder p="lg" radius="md" mb="xl">
        <Group gap="xs" mb="md">
          <IconStack2 size={18} color="var(--mantine-color-violet-6)" />
          <Title order={3} size="h5" fw={600}>
            Collection Composition
          </Title>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
          {(stats.totalRead > 0 || stats.totalUnread > 0) && (
            <Stack align="center" gap="xs">
              <Text size="sm" fw={600} c="dimmed">
                Read vs Unread
              </Text>
              <DonutChart
                data={readUnreadData}
                size={140}
                thickness={24}
                withTooltip
                withLabelsLine={false}
              />
              <DonutLegend data={readUnreadData} />
            </Stack>
          )}

          {comicsByTypeData.length > 0 && (
            <Stack align="center" gap="xs">
              <Text size="sm" fw={600} c="dimmed">
                By Type
              </Text>
              <DonutChart
                data={comicsByTypeData}
                size={140}
                thickness={24}
                withTooltip
                withLabelsLine={false}
              />
              <DonutLegend data={comicsByTypeData} />
            </Stack>
          )}

          {radarEraData.length > 1 && (
            <Stack align="center" gap="xs">
              <Text size="sm" fw={600} c="dimmed">
                By Era
              </Text>
              <RadarChart
                h={160}
                data={radarEraData}
                dataKey="subject"
                series={[{ name: 'count', color: 'violet.6', opacity: 0.3 }]}
                withPolarGrid
                withPolarAngleAxis
              />
            </Stack>
          )}
        </SimpleGrid>
      </Paper>

      {/* ── Section 3: Financial Insights ── */}
      {(stats.spendingByMonth.length > 0 ||
        stats.publishersBySpend.length > 0) && (
        <Paper withBorder p="lg" radius="md" mb="xl">
          <Group gap="xs" mb="md">
            <IconCurrencyDollar
              size={18}
              color="var(--mantine-color-violet-6)"
            />
            <Title order={3} size="h5" fw={600}>
              Financial Insights
            </Title>
          </Group>

          <SimpleGrid cols={{ base: 1, md: 2 }} mb="md">
            {spendingChartData.length > 0 && (
              <Box>
                <Text size="sm" fw={600} c="dimmed" mb="xs">
                  Monthly Spend vs Cover Value
                </Text>
                <CompositeChart
                  h={280}
                  data={spendingChartData}
                  dataKey="month"
                  series={[
                    { name: 'Spent', color: 'violet.6', type: 'bar' },
                    {
                      name: 'Cover Value',
                      color: 'violet.4',
                      type: 'line',
                    },
                  ]}
                  barProps={{ radius: 3 }}
                  tickLine="none"
                  withTooltip
                  withLegend
                  curveType="monotone"
                />
              </Box>
            )}

            {stats.publishersBySpend.length > 0 && (
              <Box>
                <Text size="sm" fw={600} c="dimmed" mb="xs">
                  Spending by Publisher
                </Text>
                <BarChart
                  h={280}
                  data={stats.publishersBySpend.map((d) => ({
                    name: d.name,
                    Spent: Math.round(d.count / 100),
                  }))}
                  dataKey="name"
                  series={[
                    { name: 'Spent', color: 'violet.5', label: 'Spent ($)' },
                  ]}
                  orientation="horizontal"
                  gridAxis="x"
                  withTooltip
                  barProps={{ radius: 3 }}
                  tickLine="none"
                />
              </Box>
            )}
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            <MiniInsightCard
              label="Average Price Paid"
              value={formatCurrency(stats.averagePurchasePriceCents)}
              icon={<IconTag size={24} color="var(--mantine-color-violet-6)" />}
            />
            <MiniInsightCard
              label="Total Savings"
              value={`${savings >= 0 ? '+' : '-'}${savingsFormatted}`}
              color={savingsColor}
              icon={
                <IconPigMoney
                  size={24}
                  color={`var(--mantine-color-${savingsColor}-6)`}
                />
              }
            />
            <MiniInsightCard
              label="Preordered"
              value={formatNumber(stats.preorderedCount)}
              icon={
                <IconShoppingCart
                  size={24}
                  color="var(--mantine-color-violet-6)"
                />
              }
            />
          </SimpleGrid>
        </Paper>
      )}

      {/* ── Section 4: Creators & Characters ── */}
      {(stats.topCreators.length > 0 || stats.topCharacters.length > 0) && (
        <Paper withBorder p="lg" radius="md" mb="xl">
          <Group gap="xs" mb="md">
            <IconUsers size={18} color="var(--mantine-color-violet-6)" />
            <Title order={3} size="h5" fw={600}>
              Creators &amp; Characters
            </Title>
          </Group>
          <SimpleGrid cols={{ base: 1, md: 2 }}>
            {stats.topCreators.length > 0 && (
              <Box>
                <Text size="sm" fw={600} c="dimmed" mb="xs">
                  Top Creators
                </Text>
                <BarChart
                  h={300}
                  data={stats.topCreators.map((c) => ({
                    name: c.name,
                    count: c.count,
                  }))}
                  dataKey="name"
                  series={[
                    { name: 'count', color: 'violet.6', label: 'Comics' },
                  ]}
                  orientation="horizontal"
                  gridAxis="x"
                  withTooltip
                  barProps={{ radius: 3 }}
                  tickLine="none"
                />
              </Box>
            )}
            {stats.topCharacters.length > 0 && (
              <Box>
                <Text size="sm" fw={600} c="dimmed" mb="xs">
                  Top Characters
                </Text>
                <BarChart
                  h={300}
                  data={stats.topCharacters}
                  dataKey="name"
                  series={[
                    { name: 'count', color: 'violet.5', label: 'Comics' },
                  ]}
                  orientation="horizontal"
                  gridAxis="x"
                  withTooltip
                  barProps={{ radius: 3 }}
                  tickLine="none"
                />
              </Box>
            )}
          </SimpleGrid>
        </Paper>
      )}

      {/* ── Section 5: Collection Deep Dive ── */}
      <Paper withBorder p="lg" radius="md" mb="xl">
        <Group gap="xs" mb="md">
          <IconBooks size={18} color="var(--mantine-color-violet-6)" />
          <Title order={3} size="h5" fw={600}>
            Collection Deep Dive
          </Title>
        </Group>

        {/* Row 1: Year & Growth */}
        <SimpleGrid cols={{ base: 1, md: 2 }} mb="md">
          {comicsByYearStr.length > 0 && (
            <Box>
              <Text size="sm" fw={600} c="dimmed" mb="xs">
                Comics by Year
              </Text>
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
            </Box>
          )}
          {stats.comicsAddedPerMonth.length > 0 && (
            <Box>
              <Text size="sm" fw={600} c="dimmed" mb="xs">
                Collection Growth (Last 12 Months)
              </Text>
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
            </Box>
          )}
        </SimpleGrid>

        {/* Row 2: Genres, Condition, Ratings */}
        {(stats.comicsByGenre.length > 0 ||
          stats.comicsByCondition.length > 0 ||
          stats.ratingDistribution.length > 0) && (
          <SimpleGrid cols={{ base: 1, md: 3 }} mb="md">
            {stats.comicsByGenre.length > 0 && (
              <Box>
                <Text size="sm" fw={600} c="dimmed" mb="xs">
                  Top Genres
                </Text>
                <BarChart
                  h={220}
                  data={stats.comicsByGenre}
                  dataKey="name"
                  series={[
                    { name: 'count', color: 'violet.6', label: 'Comics' },
                  ]}
                  gridAxis="y"
                  withTooltip
                  barProps={{ radius: 3 }}
                  tickLine="none"
                />
              </Box>
            )}
            {stats.comicsByCondition.length > 0 && (
              <Box>
                <Text size="sm" fw={600} c="dimmed" mb="xs">
                  Condition Breakdown
                </Text>
                <Center>
                  <DonutChart
                    data={stats.comicsByCondition.map((d, i) => ({
                      name: d.name,
                      value: d.count,
                      color: (
                        [
                          'violet.9',
                          'violet.7',
                          'violet.5',
                          'violet.4',
                          'violet.3',
                        ] as const
                      )[i % 5],
                    }))}
                    size={160}
                    thickness={26}
                    withTooltip
                    withLabelsLine={false}
                  />
                </Center>
                <DonutLegend
                  data={stats.comicsByCondition.map((d, i) => ({
                    name: d.name,
                    value: d.count,
                    color: (
                      [
                        'violet.9',
                        'violet.7',
                        'violet.5',
                        'violet.4',
                        'violet.3',
                      ] as const
                    )[i % 5],
                  }))}
                />
              </Box>
            )}
            {stats.ratingDistribution.length > 0 && (
              <Box>
                <Text size="sm" fw={600} c="dimmed" mb="xs">
                  Rating Distribution
                </Text>
                <BarChart
                  h={220}
                  data={stats.ratingDistribution}
                  dataKey="name"
                  series={[
                    { name: 'count', color: 'violet.6', label: 'Comics' },
                  ]}
                  gridAxis="y"
                  withTooltip
                  barProps={{ radius: 3 }}
                  tickLine="none"
                />
              </Box>
            )}
          </SimpleGrid>
        )}

        {/* Row 3: Top Series */}
        {stats.comicsBySeries.length > 0 && (
          <Box>
            <Text size="sm" fw={600} c="dimmed" mb="xs">
              Top Series
            </Text>
            <BarChart
              h={250}
              data={stats.comicsBySeries}
              dataKey="name"
              series={[{ name: 'count', color: 'violet.6', label: 'Comics' }]}
              orientation="horizontal"
              gridAxis="x"
              withTooltip
              barProps={{ radius: 3 }}
              tickLine="none"
            />
          </Box>
        )}
      </Paper>

      {/* ── Section 6: Recent Activity ── */}
      <Paper withBorder p="lg" radius="md" mb="xl">
        <Group gap="xs" mb="md">
          <IconStarFilled size={18} color="var(--mantine-color-violet-6)" />
          <Title order={3} size="h5" fw={600}>
            Recent Activity
          </Title>
        </Group>

        {/* Row 1: Recently Added & Recent Purchases */}
        <SimpleGrid cols={{ base: 1, md: 2 }} mb="md">
          {stats.recentlyAdded.length > 0 && (
            <Box>
              <Text size="sm" fw={600} c="dimmed" mb="xs">
                Recently Added
              </Text>
              <ScrollArea>
                <Group gap="md" wrap="nowrap" pb="xs">
                  {stats.recentlyAdded.map((comic) => (
                    <ComicCoverCard key={comic.id} comic={comic} />
                  ))}
                </Group>
              </ScrollArea>
            </Box>
          )}

          {stats.recentPurchases.length > 0 && (
            <Box>
              <Text size="sm" fw={600} c="dimmed" mb="xs">
                Recent Purchases
              </Text>
              <ScrollArea>
                <Group gap="md" wrap="nowrap" pb="xs">
                  {stats.recentPurchases.map((comic) => (
                    <ComicCoverCard key={comic.id} comic={comic} showPurchase />
                  ))}
                </Group>
              </ScrollArea>
            </Box>
          )}
        </SimpleGrid>

        {/* Row 2: Badge mini cards */}
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <MiniInsightCard
            label="Signed Comics"
            value={formatNumber(stats.signedCount)}
            icon={
              <IconSignature size={24} color="var(--mantine-color-violet-6)" />
            }
          />
          <MiniInsightCard
            label="Graded Comics"
            value={formatNumber(stats.gradedCount)}
            icon={
              <IconShield size={24} color="var(--mantine-color-violet-6)" />
            }
          />
          <MiniInsightCard
            label="Storage Locations"
            value={formatNumber(stats.topStorageLocations.length)}
            icon={
              <IconBuildingSkyscraper
                size={24}
                color="var(--mantine-color-violet-6)"
              />
            }
          />
        </SimpleGrid>
      </Paper>
    </Container>
  )
}
