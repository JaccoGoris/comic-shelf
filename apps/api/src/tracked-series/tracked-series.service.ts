import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@comic-shelf/db'
import { MetronService } from '../metron/metron.service'
import type {
  CreateTrackedSeriesDto,
  TrackedSeriesDto,
  SeriesIssueDto,
} from '@comic-shelf/shared-types'

@Injectable()
export class TrackedSeriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metronService: MetronService
  ) {}

  async listAll(): Promise<TrackedSeriesDto[]> {
    const trackedSeries = await this.prisma.trackedSeries.findMany({
      orderBy: { createdAt: 'asc' },
    })

    return Promise.all(
      trackedSeries.map(async (ts) => {
        const [ownedCount, missingCount] = await this.getSeriesCounts(
          ts.metronSeriesId
        )
        return this.toDto(ts, ownedCount, missingCount)
      })
    )
  }

  async create(dto: CreateTrackedSeriesDto): Promise<TrackedSeriesDto> {
    // Upsert the TrackedSeries record
    const ts = await this.prisma.trackedSeries.upsert({
      where: { metronSeriesId: dto.metronSeriesId },
      create: {
        metronSeriesId: dto.metronSeriesId,
        name: dto.name,
        volume: dto.volume ?? null,
        publisher: dto.publisher ?? null,
        yearBegan: dto.yearBegan ?? null,
        issueCount: dto.issueCount ?? null,
      },
      update: {
        name: dto.name,
        volume: dto.volume ?? null,
        publisher: dto.publisher ?? null,
        yearBegan: dto.yearBegan ?? null,
        issueCount: dto.issueCount ?? null,
      },
    })

    // Populate MISSING comics for this series
    await this.metronService.populateTrackedSeries(
      dto.metronSeriesId,
      dto.name,
      dto.volume ?? null
    )

    const [ownedCount, missingCount] = await this.getSeriesCounts(
      dto.metronSeriesId
    )
    return this.toDto(ts, ownedCount, missingCount)
  }

  async remove(id: number): Promise<void> {
    const ts = await this.prisma.trackedSeries.findUnique({ where: { id } })
    if (!ts) {
      throw new NotFoundException(`Tracked series with id ${id} not found`)
    }
    await this.prisma.trackedSeries.delete({ where: { id } })
    // Note: does NOT delete MISSING comics — those remain as reminders
  }

  async getIssues(metronSeriesId: number): Promise<SeriesIssueDto[]> {
    const comics = await this.prisma.comic.findMany({
      where: {
        series: { metronSeriesId },
        collectionWishlist: { in: ['COLLECTION', 'MISSING'] },
      },
      include: {
        publisher: true,
        series: { include: { publisher: true } },
      },
      orderBy: [{ issueNumber: 'asc' }],
    })

    return comics.map((c) => ({
      id: c.id,
      itemId: String(c.itemId),
      title: c.title,
      issueNumber: c.issueNumber,
      volume: c.volume,
      coverDate: c.coverDate,
      year: c.year,
      read: c.read,
      coverPriceCents: c.coverPriceCents,
      coverPriceCurrency: c.coverPriceCurrency,
      publisher: c.publisher ?? null,
      series: c.series
        ? {
            id: c.series.id,
            name: c.series.name,
            publisher: c.series.publisher ?? null,
            metronSeriesId: c.series.metronSeriesId ?? null,
          }
        : null,
      typeOfComic: c.typeOfComic,
      metronId: c.metronId,
      coverImageUrl: c.coverImageUrl,
      collectionWishlist: c.collectionWishlist as 'COLLECTION' | 'MISSING',
      collectionType: c.collectionWishlist as 'COLLECTION' | 'MISSING',
    }))
  }

  private async getSeriesCounts(
    metronSeriesId: number
  ): Promise<[number, number]> {
    return Promise.all([
      this.prisma.comic.count({
        where: {
          series: { metronSeriesId },
          collectionWishlist: 'COLLECTION',
        },
      }),
      this.prisma.comic.count({
        where: {
          series: { metronSeriesId },
          collectionWishlist: 'MISSING',
        },
      }),
    ])
  }

  private toDto(
    ts: {
      id: number
      metronSeriesId: number
      name: string
      volume: number | null
      publisher: string | null
      yearBegan: number | null
      issueCount: number | null
      createdAt: Date
    },
    ownedCount: number,
    missingCount: number
  ): TrackedSeriesDto {
    return {
      id: ts.id,
      metronSeriesId: ts.metronSeriesId,
      name: ts.name,
      volume: ts.volume,
      publisher: ts.publisher,
      yearBegan: ts.yearBegan,
      issueCount: ts.issueCount,
      ownedCount,
      missingCount,
      createdAt: ts.createdAt.toISOString(),
    }
  }
}
