import { Injectable } from '@nestjs/common'
import { PrismaService } from '@comic-shelf/db'
import type {
  DashboardStatsDto,
  NameCountItem,
  CreatorStatItem,
} from '@comic-shelf/shared-types'

function resolveNames(
  groups: { id: number; count: number }[],
  nameMap: Map<number, string>
): NameCountItem[] {
  return groups
    .map((g) => ({ name: nameMap.get(g.id), count: g.count }))
    .filter((item): item is NameCountItem => item.name !== undefined)
}

/**
 * Merges publisher name variants into canonical names and re-sorts descending.
 *
 * Rules (evaluated in order, case-insensitive):
 *   - Name contains "marvel" → merged under "Marvel"
 *   - Name contains "dc"     → merged under "DC Comics"
 *
 * After merging the result is sorted by count descending and sliced to `limit`.
 */
function mergePublisherVariants(
  items: NameCountItem[],
  limit: number = 10
): NameCountItem[] {
  const canonicalName = (name: string): string => {
    const lower = name.toLowerCase()
    if (lower.includes('marvel')) return 'Marvel'
    if (lower.includes('dc')) return 'DC Comics'
    return name
  }

  const merged = new Map<string, number>()
  for (const item of items) {
    const key = canonicalName(item.name)
    merged.set(key, (merged.get(key) ?? 0) + item.count)
  }

  return [...merged.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(): Promise<DashboardStatsDto> {
    const [
      totalComics,
      totalRead,
      collectionCount,
      wishlistCount,
      coverValueAgg,
      purchaseSpendAgg,
      publisherCount,
      seriesCount,
      publisherGroups,
      seriesGroups,
      yearGroups,
      genreGroups,
      monthRows,
      recentComics,
      // New queries
      pagesAgg,
      avgPriceAgg,
      totalCreators,
      totalCharacters,
      gradedCount,
      signedCount,
      preorderedCount,
      spendingByMonthRows,
      creatorGroups,
      characterGroups,
      typeGroups,
      eraGroups,
      conditionGroups,
      ratingGroups,
      publisherSpendGroups,
      recentPurchases,
      storageGroups,
    ] = await Promise.all([
      this.prisma.comic.count(),
      this.prisma.comic.count({ where: { read: true } }),
      this.prisma.comic.count({ where: { collectionWishlist: 'COLLECTION' } }),
      this.prisma.comic.count({ where: { collectionWishlist: 'WISHLIST' } }),
      this.prisma.comic.aggregate({ _sum: { coverPriceCents: true } }),
      this.prisma.comic.aggregate({ _sum: { purchasePriceCents: true } }),
      this.prisma.publisher.count(),
      this.prisma.series.count(),
      this.prisma.comic.groupBy({
        by: ['publisherId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
        where: { publisherId: { not: null } },
      }),
      this.prisma.comic.groupBy({
        by: ['seriesId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
        where: { seriesId: { not: null } },
      }),
      this.prisma.comic.groupBy({
        by: ['year'],
        _count: { id: true },
        orderBy: { year: 'asc' },
        where: { year: { not: null } },
      }),
      this.prisma.comicGenre.groupBy({
        by: ['genreId'],
        _count: { comicId: true },
        orderBy: { _count: { comicId: 'desc' } },
        take: 8,
      }),
      this.prisma.$queryRaw<{ month: string; count: bigint }[]>`
        SELECT to_char(date_added, 'YYYY-MM') as month, COUNT(*)::bigint as count
        FROM comics
        WHERE date_added >= now() - interval '12 months'
          AND date_added IS NOT NULL
        GROUP BY to_char(date_added, 'YYYY-MM')
        ORDER BY 1 ASC
      `,
      this.prisma.comic.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          publisher: { select: { name: true } },
          series: { select: { name: true } },
        },
      }),
      // New: total pages
      this.prisma.comic.aggregate({ _sum: { numberOfPages: true } }),
      // New: average purchase price
      this.prisma.comic.aggregate({
        _avg: { purchasePriceCents: true },
        where: { purchasePriceCents: { not: null } },
      }),
      // New: distinct creator count
      this.prisma.creator.count(),
      // New: distinct character count
      this.prisma.character.count(),
      // New: graded count
      this.prisma.comic.count({ where: { gradedBy: { not: null } } }),
      // New: signed count
      this.prisma.comic.count({ where: { signedBy: { not: null } } }),
      // New: preordered count
      this.prisma.comic.count({ where: { preordered: true } }),
      // New: spending by month (raw SQL)
      this.prisma.$queryRaw<
        {
          month: string
          spent_cents: bigint
          cover_cents: bigint
          count: bigint
        }[]
      >`
        SELECT to_char(purchase_date, 'YYYY-MM') as month,
               COALESCE(SUM(purchase_price_cents), 0)::bigint as spent_cents,
               COALESCE(SUM(cover_price_cents), 0)::bigint as cover_cents,
               COUNT(*)::bigint as count
        FROM comics
        WHERE purchase_date IS NOT NULL
          AND purchase_date >= now() - interval '12 months'
        GROUP BY 1 ORDER BY 1 ASC
      `,
      // New: top creators by comic count
      this.prisma.comicCreator.groupBy({
        by: ['creatorId', 'role'],
        _count: { comicId: true },
        orderBy: { _count: { comicId: 'desc' } },
        take: 30,
      }),
      // New: top characters
      this.prisma.comicCharacter.groupBy({
        by: ['characterId'],
        _count: { comicId: true },
        orderBy: { _count: { comicId: 'desc' } },
        take: 10,
      }),
      // New: comics by type
      this.prisma.comic.groupBy({
        by: ['typeOfComic'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        where: { typeOfComic: { not: null } },
      }),
      // New: comics by era
      this.prisma.comic.groupBy({
        by: ['era'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        where: { era: { not: null } },
      }),
      // New: comics by condition
      this.prisma.comic.groupBy({
        by: ['condition'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        where: { condition: { not: null } },
      }),
      // New: rating distribution
      this.prisma.comic.groupBy({
        by: ['personalRating'],
        _count: { id: true },
        orderBy: { personalRating: 'asc' },
        where: { personalRating: { not: null } },
      }),
      // New: publishers by spend
      this.prisma.comic.groupBy({
        by: ['publisherId'],
        _sum: { purchasePriceCents: true },
        orderBy: { _sum: { purchasePriceCents: 'desc' } },
        take: 10,
        where: {
          publisherId: { not: null },
          purchasePriceCents: { not: null },
        },
      }),
      // New: recent purchases
      this.prisma.comic.findMany({
        take: 5,
        orderBy: { purchaseDate: 'desc' },
        where: { purchaseDate: { not: null } },
        include: {
          publisher: { select: { name: true } },
          series: { select: { name: true } },
        },
      }),
      // New: top storage locations
      this.prisma.comic.groupBy({
        by: ['storageLocation'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
        where: { storageLocation: { not: null } },
      }),
    ])

    // Resolve publisher/series/genre names in parallel
    const publisherIds = publisherGroups
      .map((g) => g.publisherId)
      .filter((id): id is number => id !== null)
    const seriesIds = seriesGroups
      .map((g) => g.seriesId)
      .filter((id): id is number => id !== null)
    const genreIds = genreGroups.map((g) => g.genreId)
    const creatorIds = [...new Set(creatorGroups.map((g) => g.creatorId))]
    const characterIds = characterGroups.map((g) => g.characterId)
    const publisherSpendIds = publisherSpendGroups
      .map((g) => g.publisherId)
      .filter((id): id is number => id !== null)

    const [
      publishers,
      seriesList,
      genres,
      creators,
      characters,
      spendPublishers,
    ] = await Promise.all([
      this.prisma.publisher.findMany({
        where: { id: { in: publisherIds } },
        select: { id: true, name: true },
      }),
      this.prisma.series.findMany({
        where: { id: { in: seriesIds } },
        select: { id: true, name: true },
      }),
      this.prisma.genre.findMany({
        where: { id: { in: genreIds } },
        select: { id: true, name: true },
      }),
      this.prisma.creator.findMany({
        where: { id: { in: creatorIds } },
        select: { id: true, name: true },
      }),
      this.prisma.character.findMany({
        where: { id: { in: characterIds } },
        select: { id: true, name: true },
      }),
      this.prisma.publisher.findMany({
        where: { id: { in: publisherSpendIds } },
        select: { id: true, name: true },
      }),
    ])

    const publisherMap = new Map(publishers.map((p) => [p.id, p.name]))
    const seriesMap = new Map(seriesList.map((s) => [s.id, s.name]))
    const genreMap = new Map(genres.map((g) => [g.id, g.name]))
    const creatorMap = new Map(creators.map((c) => [c.id, c.name]))
    const characterMap = new Map(characters.map((c) => [c.id, c.name]))
    const spendPublisherMap = new Map(
      spendPublishers.map((p) => [p.id, p.name])
    )

    const comicsByPublisher = mergePublisherVariants(
      resolveNames(
        publisherGroups.map((g) => ({
          id: g.publisherId!,
          count: g._count.id,
        })),
        publisherMap
      )
    )

    const comicsBySeries = resolveNames(
      seriesGroups.map((g) => ({ id: g.seriesId!, count: g._count.id })),
      seriesMap
    )

    const comicsByYear = yearGroups.map((g) => ({
      year: g.year!,
      count: g._count.id,
    }))

    const comicsByGenre = resolveNames(
      genreGroups.map((g) => ({ id: g.genreId, count: g._count.comicId })),
      genreMap
    )

    const comicsAddedPerMonth = monthRows.map((r) => ({
      month: r.month,
      count: Number(r.count),
    }))

    const recentlyAdded = recentComics.map((c) => ({
      id: c.id,
      title: c.title,
      issueNumber: c.issueNumber ?? null,
      coverImageUrl: c.coverImageUrl ?? null,
      publisher: c.publisher?.name ?? null,
      series: c.series?.name ?? null,
      dateAdded: c.dateAdded?.toISOString() ?? c.createdAt.toISOString(),
      purchasePriceCents: c.purchasePriceCents ?? null,
      purchaseDate: c.purchaseDate?.toISOString() ?? null,
    }))

    const totalCoverValueCents = coverValueAgg._sum.coverPriceCents ?? 0
    const totalPurchaseSpendCents =
      purchaseSpendAgg._sum.purchasePriceCents ?? 0
    const readPercentage =
      totalComics > 0 ? Math.round((totalRead / totalComics) * 100) : 0

    // New aggregates
    const totalPages = pagesAgg._sum.numberOfPages ?? 0
    const averagePurchasePriceCents = Math.round(
      avgPriceAgg._avg.purchasePriceCents ?? 0
    )
    const totalSavingsCents = totalCoverValueCents - totalPurchaseSpendCents

    // Spending by month
    const spendingByMonth = spendingByMonthRows.map((r) => ({
      month: r.month,
      spentCents: Number(r.spent_cents),
      coverCents: Number(r.cover_cents),
      count: Number(r.count),
    }))

    // Top creators: aggregate by creatorId, sum counts, pick dominant role
    const creatorCountMap = new Map<number, { count: number; role: string }>()
    for (const g of creatorGroups) {
      const existing = creatorCountMap.get(g.creatorId)
      const count = g._count.comicId
      if (!existing || count > existing.count) {
        creatorCountMap.set(g.creatorId, { count, role: g.role })
      } else {
        creatorCountMap.set(g.creatorId, {
          count: existing.count + count,
          role: existing.role,
        })
      }
    }

    const topCreators: CreatorStatItem[] = [...creatorCountMap.entries()]
      .map(([id, { count, role }]) => ({
        name: creatorMap.get(id) ?? '',
        count,
        role,
      }))
      .filter((c) => c.name !== '')
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Top characters
    const topCharacters: NameCountItem[] = characterGroups
      .map((g) => ({
        name: characterMap.get(g.characterId) ?? '',
        count: g._count.comicId,
      }))
      .filter((c) => c.name !== '')

    // Comics by type
    const comicsByType: NameCountItem[] = typeGroups.map((g) => ({
      name: g.typeOfComic!,
      count: g._count.id,
    }))

    // Comics by era
    const comicsByEra: NameCountItem[] = eraGroups.map((g) => ({
      name: g.era!,
      count: g._count.id,
    }))

    // Comics by condition
    const comicsByCondition: NameCountItem[] = conditionGroups.map((g) => ({
      name: g.condition!,
      count: g._count.id,
    }))

    // Rating distribution
    const ratingDistribution: NameCountItem[] = ratingGroups.map((g) => ({
      name: g.personalRating!,
      count: g._count.id,
    }))

    // Publishers by spend (reuse NameCountItem, count = cents)
    const publishersBySpend: NameCountItem[] = mergePublisherVariants(
      publisherSpendGroups
        .map((g) => ({
          name: spendPublisherMap.get(g.publisherId!) ?? '',
          count: g._sum.purchasePriceCents ?? 0,
        }))
        .filter((p) => p.name !== '')
    )

    // Sparklines: last 6 months
    const last6Months = comicsAddedPerMonth.slice(-6).map((m) => m.count)
    const last6SpendMonths = spendingByMonth.slice(-6).map((m) => m.spentCents)

    // Recent purchases
    const recentPurchasesResult = recentPurchases.map((c) => ({
      id: c.id,
      title: c.title,
      issueNumber: c.issueNumber ?? null,
      coverImageUrl: c.coverImageUrl ?? null,
      publisher: c.publisher?.name ?? null,
      series: c.series?.name ?? null,
      dateAdded: c.dateAdded?.toISOString() ?? c.createdAt.toISOString(),
      purchasePriceCents: c.purchasePriceCents ?? null,
      purchaseDate: c.purchaseDate?.toISOString() ?? null,
    }))

    // Top storage locations
    const topStorageLocations: NameCountItem[] = storageGroups.map((g) => ({
      name: g.storageLocation!,
      count: g._count.id,
    }))

    return {
      totalComics,
      totalRead,
      totalUnread: totalComics - totalRead,
      readPercentage,
      collectionCount,
      wishlistCount,
      totalCoverValueCents,
      totalPurchaseSpendCents,
      publisherCount,
      seriesCount,
      totalPages,
      totalCreators,
      totalCharacters,
      gradedCount,
      signedCount,
      preorderedCount,
      averagePurchasePriceCents,
      totalSavingsCents,
      comicsByPublisher,
      comicsBySeries,
      comicsByYear,
      comicsByGenre,
      comicsAddedPerMonth,
      recentlyAdded,
      spendingByMonth,
      topCreators,
      topCharacters,
      comicsByType,
      comicsByEra,
      comicsByCondition,
      ratingDistribution,
      publishersBySpend,
      monthlyGrowthSparkline: last6Months,
      monthlySpendSparkline: last6SpendMonths,
      recentPurchases: recentPurchasesResult,
      topStorageLocations,
    }
  }
}
