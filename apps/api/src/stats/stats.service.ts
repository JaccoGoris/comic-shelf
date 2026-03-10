import { Injectable } from '@nestjs/common'
import { PrismaService } from '@comic-shelf/db'
import type { DashboardStatsDto, NameCountItem } from '@comic-shelf/shared-types'

function resolveNames(
  groups: { id: number; count: number }[],
  nameMap: Map<number, string>,
): NameCountItem[] {
  return groups
    .map((g) => ({ name: nameMap.get(g.id), count: g.count }))
    .filter((item): item is NameCountItem => item.name !== undefined)
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
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          publisher: { select: { name: true } },
          series: { select: { name: true } },
        },
      }),
    ])

    // Resolve publisher/series/genre names in parallel
    const publisherIds = publisherGroups.map((g) => g.publisherId).filter((id): id is number => id !== null)
    const seriesIds = seriesGroups.map((g) => g.seriesId).filter((id): id is number => id !== null)
    const genreIds = genreGroups.map((g) => g.genreId)

    const [publishers, seriesList, genres] = await Promise.all([
      this.prisma.publisher.findMany({ where: { id: { in: publisherIds } }, select: { id: true, name: true } }),
      this.prisma.series.findMany({ where: { id: { in: seriesIds } }, select: { id: true, name: true } }),
      this.prisma.genre.findMany({ where: { id: { in: genreIds } }, select: { id: true, name: true } }),
    ])

    const publisherMap = new Map(publishers.map((p) => [p.id, p.name]))
    const seriesMap = new Map(seriesList.map((s) => [s.id, s.name]))
    const genreMap = new Map(genres.map((g) => [g.id, g.name]))

    const comicsByPublisher = resolveNames(
      publisherGroups.map((g) => ({ id: g.publisherId!, count: g._count.id })),
      publisherMap,
    )

    const comicsBySeries = resolveNames(
      seriesGroups.map((g) => ({ id: g.seriesId!, count: g._count.id })),
      seriesMap,
    )

    const comicsByYear = yearGroups.map((g) => ({
      year: g.year!,
      count: g._count.id,
    }))

    const comicsByGenre = resolveNames(
      genreGroups.map((g) => ({ id: g.genreId, count: g._count.comicId })),
      genreMap,
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
    }))

    const totalCoverValueCents = coverValueAgg._sum.coverPriceCents ?? 0
    const totalPurchaseSpendCents = purchaseSpendAgg._sum.purchasePriceCents ?? 0
    const readPercentage = totalComics > 0
      ? Math.round((totalRead / totalComics) * 100)
      : 0

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
      comicsByPublisher,
      comicsBySeries,
      comicsByYear,
      comicsByGenre,
      comicsAddedPerMonth,
      recentlyAdded,
    }
  }
}
