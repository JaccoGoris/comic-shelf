import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
  ConflictException,
} from '@nestjs/common'
import {
  MetronClient,
  MetronApiError,
  type MetronIssueListItem,
  type MetronSeriesListItem,
} from '@comic-shelf/metron-client'
import { PrismaService } from '@comic-shelf/db'
import type { CreatorRole } from '@comic-shelf/shared-types'
import { UpsertService } from '../shared/upsert.service'
import type {
  MetronSearchResultDto,
  MetronIssueDetailDto,
  MetronSyncStatusDto,
  MetronSingleSyncResultDto,
  MetronSeriesSearchResultDto,
} from '@comic-shelf/shared-types'

// ─── Metron role name → CreatorRole mapping ──────────────

const ROLE_MAP: Record<string, CreatorRole> = {
  writer: 'WRITER',
  artist: 'ARTIST',
  penciller: 'PENCILLER',
  penciler: 'PENCILLER',
  inker: 'INKER',
  colorist: 'COLORIST',
  cover: 'COVER_ARTIST',
  'cover artist': 'COVER_ARTIST',
  letterer: 'LETTERER',
  editor: 'EDITOR',
}

@Injectable()
export class MetronService {
  private readonly logger = new Logger(MetronService.name)
  private readonly syncState = {
    running: false,
    cancelled: false,
    cancelRequested: false,
    total: 0,
    processed: 0,
    found: 0,
    skipped: 0,
    failed: 0,
    startedAt: null as Date | null,
    completedAt: null as Date | null,
  }

  constructor(
    private readonly metronClient: MetronClient,
    private readonly prisma: PrismaService,
    private readonly upsertService: UpsertService
  ) {}

  // ─── API calls ─────────────────────────────────────────

  async searchByUpc(upc: string): Promise<MetronSearchResultDto[]> {
    try {
      const response = await this.metronClient.searchIssues({ upc })
      return this.mapIssueResults(response.results)
    } catch (error) {
      this.handleApiError(error, 'searchByUpc')
    }
  }

  async searchBySeriesAndIssue(
    seriesName: string,
    issueNumber: string,
    publisherName?: string
  ): Promise<MetronSearchResultDto[]> {
    try {
      const params: {
        series_name: string
        number: string
        publisher_name?: string
      } = {
        series_name: seriesName,
        number: issueNumber,
      }
      if (publisherName) {
        params.publisher_name = publisherName
      }

      const response = await this.metronClient.searchIssues(params)
      return this.mapIssueResults(response.results)
    } catch (error) {
      this.handleApiError(error, 'searchBySeriesAndIssue')
    }
  }

  private mapIssueResults(
    results: MetronIssueListItem[]
  ): MetronSearchResultDto[] {
    return results.map((item) => ({
      id: item.id,
      series: {
        name: item.series.name,
        volume: item.series.volume,
        yearBegan: item.series.year_began,
      },
      number: item.number,
      issue: item.issue,
      coverDate: item.cover_date,
      storeDate: item.store_date,
      image: item.image,
    }))
  }

  private autoMatchIssue(
    results: MetronIssueListItem[],
    issueNumber?: string | null
  ): MetronIssueListItem | null {
    if (results.length === 0) return null
    if (results.length === 1) return results[0]

    if (issueNumber) {
      const byNumber = results.filter((r) => r.number === issueNumber)
      if (byNumber.length >= 1) return byNumber[0]
    }

    return results[0]
  }

  async getIssueDetail(metronId: number): Promise<MetronIssueDetailDto> {
    try {
      const issue = await this.metronClient.getIssueDetail(metronId)
      return {
        id: issue.id,
        publisher: issue.publisher,
        imprint: issue.imprint,
        series: {
          id: issue.series.id,
          name: issue.series.name,
          sortName: issue.series.sort_name,
          volume: issue.series.volume,
          yearBegan: issue.series.year_began,
          seriesType: issue.series.series_type,
          genres: issue.series.genres,
        },
        number: issue.number,
        title: issue.title || null,
        name: issue.name ?? [],
        coverDate: issue.cover_date,
        storeDate: issue.store_date,
        price: issue.price,
        priceCurrency: issue.price_currency,
        upc: issue.upc || null,
        isbn: issue.isbn || null,
        page: issue.page,
        desc: issue.desc || null,
        image: issue.image,
        arcs: issue.arcs.map((a) => ({ id: a.id, name: a.name })),
        credits: issue.credits.map((c) => ({
          id: c.id,
          creator: c.creator,
          role: c.role,
        })),
        characters: issue.characters.map((c) => ({
          id: c.id,
          name: c.name,
        })),
        teams: issue.teams.map((t) => ({ id: t.id, name: t.name })),
        resourceUrl: issue.resource_url,
      }
    } catch (error) {
      this.handleApiError(error, 'getIssueDetail')
    }
  }

  // ─── Series search ─────────────────────────────────────

  async getSeriesById(id: number): Promise<MetronSeriesSearchResultDto> {
    try {
      const series = await this.metronClient.getSeries(id)
      return {
        id: series.id,
        name: series.series,
        volume: series.volume,
        yearBegan: series.year_began,
        issueCount: series.issue_count,
      }
    } catch (error) {
      this.handleApiError(error, 'getSeriesById')
    }
  }

  async searchSeries(
    name: string,
    publisherName?: string
  ): Promise<MetronSeriesSearchResultDto[]> {
    try {
      const params: { name: string; publisher_name?: string } = { name }
      if (publisherName) {
        params.publisher_name = publisherName
      }
      const response = await this.metronClient.searchSeries(params)
      return this.mapSeriesResults(response.results)
    } catch (error) {
      this.handleApiError(error, 'searchSeries')
    }
  }

  private mapSeriesResults(
    results: MetronSeriesListItem[]
  ): MetronSeriesSearchResultDto[] {
    return results.map((item) => ({
      id: item.id,
      name: item.series,
      volume: item.volume,
      yearBegan: item.year_began,
      issueCount: item.issue_count,
    }))
  }

  // ─── Populate tracked series ───────────────────────────

  async populateTrackedSeries(
    metronSeriesId: number,
    seriesName: string,
    volume?: number | null
  ): Promise<{ created: number; skipped: number }> {
    let created = 0
    let skipped = 0
    let page = 1

    // Series record — upserted once, reused for all issues
    let seriesRecord: { id: number } | null = null

    while (true) {
      const response = await this.metronClient.getSeriesIssues(
        metronSeriesId,
        page
      )

      // Batch-check which issues already exist in DB for this page
      const pageIds = response.results.map((r) => r.id)
      const existingInPage = await this.prisma.comic.findMany({
        where: { metronId: { in: pageIds } },
        select: { metronId: true },
      })
      const existingIds = new Set(existingInPage.map((c) => c.metronId))

      for (const issue of response.results) {
        if (existingIds.has(issue.id)) {
          skipped++
          continue
        }

        // Upsert the series record (without publisher info — list items don't include it)
        if (!seriesRecord) {
          seriesRecord = await this.prisma.series.upsert({
            where: { metronSeriesId },
            create: {
              name: seriesName,
              publisherId: null,
              metronSeriesId,
            },
            update: {},
          })
        }

        // Build a minimal MISSING comic from the list item
        const itemId =
          BigInt(-Date.now()) - BigInt(Math.floor(Math.random() * 10000))

        const title = `${seriesName} #${issue.number}`

        let year: number | null = null
        if (issue.cover_date) {
          const parsed = new Date(issue.cover_date)
          if (!isNaN(parsed.getTime())) {
            year = parsed.getFullYear()
          }
        }

        await this.prisma.comic.create({
          data: {
            itemId,
            metronId: issue.id,
            title,
            issueNumber: issue.number,
            volume: volume != null ? String(volume) : null,
            coverDate: issue.cover_date,
            storeDate: issue.store_date ? new Date(issue.store_date) : null,
            coverImageUrl: issue.image ?? null,
            year,
            language: 'en',
            collectionWishlist: 'MISSING',
            seriesId: seriesRecord.id,
            publisherId: null,
            dateAdded: new Date(),
          },
        })

        created++
      }

      if (!response.next) {
        break
      }
      page++
    }

    this.logger.log(
      `Populated tracked series ${metronSeriesId} ("${seriesName}"): ${created} created, ${skipped} skipped`
    )

    return { created, skipped }
  }

  async importIssue(metronId: number): Promise<{ comicId: number }> {
    // Check for duplicate
    const existing = await this.prisma.comic.findUnique({
      where: { metronId },
    })
    if (existing) {
      throw new ConflictException(
        `Comic with Metron ID ${metronId} already exists (comic #${existing.id}).`
      )
    }

    // Fetch full detail from Metron
    const detail = await this.getIssueDetail(metronId)

    // Auto-generate a unique negative itemId for Metron-sourced comics
    const itemId =
      BigInt(-Date.now()) - BigInt(Math.floor(Math.random() * 10000))

    // ── Publisher ──
    const publisherRecord = await this.upsertService.upsertPublisher(
      detail.publisher.name
    )

    // ── Series ──
    const seriesRecord = await this.upsertService.upsertSeries(
      detail.series.name,
      publisherRecord.id,
      detail.series.id
    )

    // ── Parse price ──
    let coverPriceCents: number | null = null
    if (detail.price) {
      const parsed = parseFloat(detail.price)
      if (!isNaN(parsed)) {
        coverPriceCents = Math.round(parsed * 100)
      }
    }

    // ── Extract year from cover_date ──
    let year: number | null = null
    if (detail.coverDate) {
      const parsed = new Date(detail.coverDate)
      if (!isNaN(parsed.getTime())) {
        year = parsed.getFullYear()
      }
    }

    // ── Construct title ──
    const title = detail.title
      ? detail.title
      : `${detail.series.name} #${detail.number}`

    // ── Create comic ──
    const comic = await this.prisma.comic.create({
      data: {
        itemId,
        metronId: detail.id,
        barcode: detail.upc ?? null,
        title,
        synopsis: detail.desc ?? null,
        coverDate: detail.coverDate,
        issueNumber: detail.number,
        volume: String(detail.series.volume),
        year,
        coverPriceCents,
        coverPriceCurrency: detail.priceCurrency ?? null,
        numberOfPages: detail.page ?? null,
        coverImageUrl: detail.image ?? null,
        language: 'en',
        publisherId: publisherRecord.id,
        seriesId: seriesRecord.id,
      },
    })

    // ── Story Arcs ──
    for (const arc of detail.arcs) {
      const arcRecord = await this.upsertService.upsertStoryArc(arc.name)
      await this.prisma.comicStoryArc.create({
        data: { comicId: comic.id, storyArcId: arcRecord.id },
      })
    }

    // ── Credits / Creators ──
    for (const credit of detail.credits) {
      const creatorNames = splitNames(credit.creator)
      for (const creatorName of creatorNames) {
        const creatorRecord = await this.upsertService.upsertCreator(
          creatorName
        )
        for (const role of credit.role) {
          const mappedRole = mapMetronRole(role.name)
          if (!mappedRole) continue

          await this.prisma.comicCreator.upsert({
            where: {
              comicId_creatorId_role: {
                comicId: comic.id,
                creatorId: creatorRecord.id,
                role: mappedRole,
              },
            },
            create: {
              comicId: comic.id,
              creatorId: creatorRecord.id,
              role: mappedRole,
            },
            update: {},
          })
        }
      }
    }

    // ── Characters ──
    for (const char of detail.characters) {
      const charNames = splitNames(char.name)
      for (const charName of charNames) {
        const character = await this.upsertService.upsertCharacter(charName)
        await this.prisma.comicCharacter.upsert({
          where: {
            comicId_characterId: {
              comicId: comic.id,
              characterId: character.id,
            },
          },
          create: { comicId: comic.id, characterId: character.id },
          update: {},
        })
      }
    }

    // ── Genres (from series) ──
    for (const genre of detail.series.genres) {
      const genreRecord = await this.upsertService.upsertGenre(genre.name)
      await this.prisma.comicGenre.upsert({
        where: {
          comicId_genreId_type: {
            comicId: comic.id,
            genreId: genreRecord.id,
            type: 'GENRE',
          },
        },
        create: {
          comicId: comic.id,
          genreId: genreRecord.id,
          type: 'GENRE',
        },
        update: {},
      })
    }

    this.logger.log(
      `Imported Metron issue #${metronId} as comic #${comic.id}: "${title}"`
    )

    return { comicId: comic.id }
  }

  // ─── Library sync ──────────────────────────────────────

  getSyncStatus(): MetronSyncStatusDto {
    return {
      running: this.syncState.running,
      cancelled: this.syncState.cancelled,
      total: this.syncState.total,
      processed: this.syncState.processed,
      found: this.syncState.found,
      skipped: this.syncState.skipped,
      failed: this.syncState.failed,
      startedAt: this.syncState.startedAt?.toISOString() ?? null,
      completedAt: this.syncState.completedAt?.toISOString() ?? null,
    }
  }

  stopSync(): MetronSyncStatusDto {
    if (!this.syncState.running) {
      return this.getSyncStatus()
    }
    this.syncState.cancelRequested = true
    return this.getSyncStatus()
  }

  async startSync(force = false): Promise<MetronSyncStatusDto> {
    if (this.syncState.running) {
      throw new ConflictException('A sync is already in progress.')
    }
    const comics = await this.prisma.comic.findMany({
      where: force
        ? { OR: [{ metronId: { not: null } }, { barcode: { not: null } }, { issueNumber: { not: null } }] }
        : { metronId: null, OR: [{ barcode: { not: null } }, { issueNumber: { not: null } }] },
      select: {
        id: true,
        barcode: true,
        issueNumber: true,
        series: { select: { name: true } },
        publisher: { select: { name: true } },
      },
    })
    Object.assign(this.syncState, {
      running: true,
      cancelled: false,
      cancelRequested: false,
      total: comics.length,
      processed: 0,
      found: 0,
      skipped: 0,
      failed: 0,
      startedAt: new Date(),
      completedAt: null,
    })
    this.runSync(comics).catch((err) => {
      this.logger.error('Sync crashed unexpectedly', err)
      this.syncState.running = false
      this.syncState.completedAt = new Date()
    })
    return this.getSyncStatus()
  }

  private async runSync(
    comics: {
      id: number
      barcode: string | null
      issueNumber: string | null
      series: { name: string } | null
      publisher: { name: string } | null
    }[]
  ): Promise<void> {
    for (const comic of comics) {
      if (this.syncState.cancelRequested) {
        this.syncState.cancelled = true
        break
      }
      try {
        // Try UPC lookup first
        let results: MetronIssueListItem[] = []
        if (comic.barcode) {
          const res = await this.metronClient.searchIssues({
            upc: comic.barcode,
          })
          results = res.results
        }

        // Discard UPC results that don't match the stored issue number
        if (results.length > 0 && comic.issueNumber) {
          const numberMatch = results.some(
            (r) => r.number === comic.issueNumber
          )
          if (!numberMatch) {
            this.logger.log(
              `UPC results for comic #${comic.id} don't match stored issue number "${comic.issueNumber}", discarding and trying series fallback`
            )
            results = []
          }
        }

        // Fallback to series name + issue number search
        if (results.length === 0 && comic.series?.name && comic.issueNumber) {
          this.logger.log(
            `UPC lookup failed for comic #${comic.id}, falling back to series+issue search: "${comic.series.name}" #${comic.issueNumber}`
          )
          const res = await this.metronClient.searchIssues({
            series_name: comic.series.name,
            number: comic.issueNumber,
          })
          results = res.results
        }

        const item = this.autoMatchIssue(results, comic.issueNumber)
        if (item) {
          const existing = await this.prisma.comic.findUnique({
            where: { id: comic.id },
            select: {
              coverDate: true,
              volume: true,
              year: true,
              synopsis: true,
              numberOfPages: true,
              coverPriceCents: true,
            },
          })

          // Fetch full detail via DTO mapper
          const detail = await this.getIssueDetail(item.id)

          // Upsert publisher & series
          const publisherRecord = await this.upsertService.upsertPublisher(
            detail.publisher.name
          )
          const seriesRecord = await this.upsertService.upsertSeries(
            detail.series.name,
            publisherRecord.id,
            detail.series.id
          )

          // Parse cover price
          let coverPriceCents: number | undefined
          let coverPriceCurrency: string | undefined
          if (!existing?.coverPriceCents && detail.price) {
            const parsed = parseFloat(detail.price)
            if (!isNaN(parsed)) {
              coverPriceCents = Math.round(parsed * 100)
              coverPriceCurrency = detail.priceCurrency ?? undefined
            }
          }

          await this.prisma.comic.update({
            where: { id: comic.id },
            data: {
              metronId: item.id,
              barcode: detail.upc ?? undefined,
              coverImageUrl: detail.image ?? undefined,
              publisherId: publisherRecord.id,
              seriesId: seriesRecord.id,
              storeDate: detail.storeDate
                ? new Date(detail.storeDate)
                : undefined,
              coverDate:
                !existing?.coverDate && detail.coverDate
                  ? detail.coverDate
                  : undefined,
              volume:
                !existing?.volume && detail.series.volume
                  ? String(detail.series.volume)
                  : undefined,
              year:
                !existing?.year && detail.series.yearBegan
                  ? detail.series.yearBegan
                  : undefined,
              synopsis:
                !existing?.synopsis && detail.desc
                  ? detail.desc
                  : undefined,
              numberOfPages:
                !existing?.numberOfPages && detail.page
                  ? detail.page
                  : undefined,
              coverPriceCents,
              coverPriceCurrency,
            },
          })

          // Apply relationships (arcs, credits, characters, genres)
          const updatedFields: string[] = []
          await this.applyRelationships(comic.id, detail, updatedFields)

          this.syncState.found++
        } else {
          this.syncState.skipped++
        }
      } catch (err) {
        this.logger.warn(`Sync failed for comic ${comic.id}: ${err}`)
        this.syncState.failed++
      }
      this.syncState.processed++
    }

    // ── Pass 2: Check tracked series for new issues ──────
    const trackedSeries = await this.prisma.trackedSeries.findMany()
    for (const ts of trackedSeries) {
      if (this.syncState.cancelRequested) {
        this.syncState.cancelled = true
        break
      }
      try {
        const { created } = await this.populateTrackedSeries(
          ts.metronSeriesId,
          ts.name,
          ts.volume
        )
        if (created > 0) {
          this.logger.log(
            `Tracked series ${ts.metronSeriesId} "${ts.name}": ${created} new missing issues created`
          )
        }
      } catch (err) {
        this.logger.warn(
          `Failed to sync tracked series ${ts.metronSeriesId}: ${err}`
        )
      }
    }

    this.syncState.running = false
    this.syncState.completedAt = new Date()
    this.logger.log(
      `Sync complete: ${this.syncState.found} found, ${this.syncState.skipped} skipped, ${this.syncState.failed} failed`
    )
  }

  // ─── Single-issue sync ────────────────────────────────

  async syncSingleIssue(comicId: number): Promise<MetronSingleSyncResultDto> {
    const comic = await this.prisma.comic.findUnique({
      where: { id: comicId },
      select: {
        id: true,
        barcode: true,
        metronId: true,
        issueNumber: true,
        coverDate: true,
        volume: true,
        year: true,
        synopsis: true,
        numberOfPages: true,
        coverPriceCents: true,
        coverPriceCurrency: true,
        coverImageUrl: true,
        storeDate: true,
        series: { select: { name: true } },
        publisher: { select: { name: true } },
      },
    })
    if (!comic) {
      throw new HttpException('Comic not found.', HttpStatus.NOT_FOUND)
    }
    if (comic.metronId) {
      try {
        const detail = await this.getIssueDetail(comic.metronId)
        const updatedFields: string[] = []
        const updateData: Record<string, unknown> = {}

        // Upsert publisher & series
        const publisherRecord = await this.upsertService.upsertPublisher(
          detail.publisher.name
        )
        const seriesRecord = await this.upsertService.upsertSeries(
          detail.series.name,
          publisherRecord.id,
          detail.series.id
        )
        updateData.publisherId = publisherRecord.id
        updateData.seriesId = seriesRecord.id
        updatedFields.push('publisher', 'series')

        if (detail.image) {
          updateData.coverImageUrl = detail.image
          updatedFields.push('cover image')
        }
        if (detail.storeDate) {
          updateData.storeDate = new Date(detail.storeDate)
          updatedFields.push('store date')
        }
        if (!comic.coverDate && detail.coverDate) {
          updateData.coverDate = detail.coverDate
          updatedFields.push('cover date')
        }
        if (!comic.volume && detail.series.volume) {
          updateData.volume = String(detail.series.volume)
          updatedFields.push('volume')
        }
        if (!comic.year && detail.series.yearBegan) {
          updateData.year = detail.series.yearBegan
          updatedFields.push('year')
        }
        if (!comic.synopsis && detail.desc) {
          updateData.synopsis = detail.desc
          updatedFields.push('synopsis')
        }
        if (!comic.numberOfPages && detail.page) {
          updateData.numberOfPages = detail.page
          updatedFields.push('pages')
        }
        if (!comic.coverPriceCents && detail.price) {
          const parsed = parseFloat(detail.price)
          if (!isNaN(parsed)) {
            updateData.coverPriceCents = Math.round(parsed * 100)
            updateData.coverPriceCurrency = detail.priceCurrency ?? null
            updatedFields.push('cover price')
          }
        }

        if (Object.keys(updateData).length > 0) {
          await this.prisma.comic.update({ where: { id: comicId }, data: updateData })
        }

        await this.applyRelationships(comicId, detail, updatedFields)

        this.logger.log(`Re-sync for comic #${comicId} using existing Metron #${comic.metronId}`)
        return { status: 'synced', updatedFields }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        this.logger.warn(`Re-sync failed for comic #${comicId}: ${message}`)
        return { status: 'failed', reason: message }
      }
    }
    if (!comic.barcode && !comic.issueNumber) {
      return {
        status: 'skipped',
        reason: 'No barcode or issue number available for Metron lookup',
      }
    }

    try {
      // Try UPC lookup first
      let results: MetronIssueListItem[] = []
      if (comic.barcode) {
        const res = await this.metronClient.searchIssues({ upc: comic.barcode })
        results = res.results
      }

      // Discard UPC results that don't match the stored issue number
      if (results.length > 0 && comic.issueNumber) {
        const numberMatch = results.some((r) => r.number === comic.issueNumber)
        if (!numberMatch) {
          this.logger.log(
            `UPC results for comic #${comicId} don't match stored issue number "${comic.issueNumber}", discarding and trying series fallback`
          )
          results = []
        }
      }

      // Fallback to series name + issue number search
      if (results.length === 0 && comic.series?.name && comic.issueNumber) {
        this.logger.log(
          `UPC lookup failed for comic #${comicId}, falling back to series+issue search: "${comic.series.name}" #${comic.issueNumber}`
        )
        const params: {
          series_name: string
          number: string
          publisher_name?: string
        } = {
          series_name: comic.series.name,
          number: comic.issueNumber,
        }
        const res = await this.metronClient.searchIssues(params)
        results = res.results
      }

      const matched = this.autoMatchIssue(results, comic.issueNumber)
      if (!matched) {
        return {
          status: 'skipped',
          reason: `No matching issue found on Metron for comic #${comicId}`,
        }
      }

      const metronId = matched.id
      const detail = await this.getIssueDetail(metronId)
      const updatedFields: string[] = []

      // Upsert publisher & series
      const publisherRecord = await this.upsertService.upsertPublisher(
        detail.publisher.name
      )
      const seriesRecord = await this.upsertService.upsertSeries(
        detail.series.name,
        publisherRecord.id,
        detail.series.id
      )

      // Build update data, only filling in missing fields
      const updateData: Record<string, unknown> = { metronId: detail.id }
      updatedFields.push('metronId')
      updateData.publisherId = publisherRecord.id
      updateData.seriesId = seriesRecord.id
      updatedFields.push('publisher', 'series')

      if (detail.upc && detail.upc !== comic.barcode) {
        updateData.barcode = detail.upc
        updatedFields.push('barcode')
      }

      if (detail.image) {
        updateData.coverImageUrl = detail.image
        updatedFields.push('cover image')
      }
      if (detail.storeDate) {
        updateData.storeDate = new Date(detail.storeDate)
        updatedFields.push('store date')
      }
      if (!comic.coverDate && detail.coverDate) {
        updateData.coverDate = detail.coverDate
        updatedFields.push('cover date')
      }
      if (!comic.volume && detail.series.volume) {
        updateData.volume = String(detail.series.volume)
        updatedFields.push('volume')
      }
      if (!comic.year && detail.series.yearBegan) {
        updateData.year = detail.series.yearBegan
        updatedFields.push('year')
      }
      if (!comic.synopsis && detail.desc) {
        updateData.synopsis = detail.desc
        updatedFields.push('synopsis')
      }
      if (!comic.numberOfPages && detail.page) {
        updateData.numberOfPages = detail.page
        updatedFields.push('pages')
      }
      if (!comic.coverPriceCents && detail.price) {
        const parsed = parseFloat(detail.price)
        if (!isNaN(parsed)) {
          updateData.coverPriceCents = Math.round(parsed * 100)
          updateData.coverPriceCurrency = detail.priceCurrency ?? null
          updatedFields.push('cover price')
        }
      }

      await this.prisma.comic.update({
        where: { id: comicId },
        data: updateData,
      })

      await this.applyRelationships(comicId, detail, updatedFields)

      this.logger.log(
        `Single sync for comic #${comicId}: matched Metron #${metronId}`
      )
      return { status: 'synced', updatedFields }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      this.logger.warn(`Single sync failed for comic #${comicId}: ${message}`)
      return { status: 'failed', reason: message }
    }
  }

  private async applyRelationships(
    comicId: number,
    detail: MetronIssueDetailDto,
    updatedFields: string[]
  ): Promise<void> {
    // Upsert story arcs
    for (const arc of detail.arcs) {
      const arcRecord = await this.upsertService.upsertStoryArc(arc.name)
      await this.prisma.comicStoryArc.upsert({
        where: { comicId_storyArcId: { comicId, storyArcId: arcRecord.id } },
        create: { comicId, storyArcId: arcRecord.id },
        update: {},
      })
    }
    if (detail.arcs.length > 0) updatedFields.push('story arcs')

    // Upsert creators
    for (const credit of detail.credits) {
      const creatorNames = splitNames(credit.creator)
      for (const creatorName of creatorNames) {
        const creatorRecord = await this.upsertService.upsertCreator(creatorName)
        for (const role of credit.role) {
          const mappedRole = mapMetronRole(role.name)
          if (!mappedRole) continue
          await this.prisma.comicCreator.upsert({
            where: {
              comicId_creatorId_role: {
                comicId,
                creatorId: creatorRecord.id,
                role: mappedRole,
              },
            },
            create: { comicId, creatorId: creatorRecord.id, role: mappedRole },
            update: {},
          })
        }
      }
    }
    if (detail.credits.length > 0) updatedFields.push('creators')

    // Upsert characters
    for (const char of detail.characters) {
      const charNames = splitNames(char.name)
      for (const charName of charNames) {
        const character = await this.upsertService.upsertCharacter(charName)
        await this.prisma.comicCharacter.upsert({
          where: { comicId_characterId: { comicId, characterId: character.id } },
          create: { comicId, characterId: character.id },
          update: {},
        })
      }
    }
    if (detail.characters.length > 0) updatedFields.push('characters')

    // Upsert genres
    for (const genre of detail.series.genres) {
      const genreRecord = await this.upsertService.upsertGenre(genre.name)
      await this.prisma.comicGenre.upsert({
        where: {
          comicId_genreId_type: { comicId, genreId: genreRecord.id, type: 'GENRE' },
        },
        create: { comicId, genreId: genreRecord.id, type: 'GENRE' },
        update: {},
      })
    }
    if (detail.series.genres.length > 0) updatedFields.push('genres')
  }

  // ─── Error handling ────────────────────────────────────

  private handleApiError(error: unknown, method: string): never {
    if (error instanceof MetronApiError) {
      const status = error.statusCode
      this.logger.error(
        `Metron API error in ${method}: ${status} — ${error.message}`
      )

      if (status === 401) {
        throw new HttpException(
          'Metron API authentication failed. Check METRON_USERNAME and METRON_PASSWORD.',
          HttpStatus.UNAUTHORIZED
        )
      }
      if (status === 404) {
        throw new HttpException(
          'Issue not found on Metron.',
          HttpStatus.NOT_FOUND
        )
      }
      if (status === 429) {
        throw new HttpException(
          error.retryAfter
            ? `Metron API rate limit exceeded. Retry after ${
                error.retryAfter / 1000
              }s.`
            : 'Metron API rate limit exceeded. Please wait and try again.',
          HttpStatus.TOO_MANY_REQUESTS
        )
      }
      if (status === 0) {
        throw new HttpException(
          'Failed to reach Metron API.',
          HttpStatus.BAD_GATEWAY
        )
      }
      throw new HttpException(
        `Metron API returned ${status}`,
        HttpStatus.BAD_GATEWAY
      )
    }

    const message = error instanceof Error ? error.message : String(error)
    this.logger.error(`Metron API error in ${method}: ${message}`)
    throw new HttpException(
      'Failed to reach Metron API.',
      HttpStatus.BAD_GATEWAY
    )
  }
}

// ─── Helpers ─────────────────────────────────────────────

function splitNames(str: string): string[] {
  return str
    .split(/\s*&\s*/)
    .map((n) => n.trim())
    .filter(Boolean)
}

function mapMetronRole(roleName: string): CreatorRole | null {
  const key = roleName.toLowerCase().trim()
  return ROLE_MAP[key] ?? null
}
