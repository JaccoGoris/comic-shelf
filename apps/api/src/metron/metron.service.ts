import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
  ConflictException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '@comic-shelf/db';
import { CreatorRole } from '@prisma/client';
import { UpsertService } from '../shared/upsert.service';
import { firstValueFrom, Observable } from 'rxjs';
import type { AxiosResponse } from 'axios';
import type {
  MetronSearchResultDto,
  MetronIssueDetailDto,
  MetronSyncStatusDto,
} from '@comic-shelf/shared-types';

// ─── Metron API response interfaces ─────────────────────

interface MetronPaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

interface MetronIssueListItem {
  id: number;
  series: {
    name: string;
    volume: number;
    year_began: number;
  };
  number: string;
  issue: string;
  cover_date: string;
  store_date: string | null;
  image: string | null;
  cover_hash: string;
  modified: string;
}

interface MetronIssueDetail {
  id: number;
  publisher: { id: number; name: string };
  imprint: { id: number; name: string } | null;
  series: {
    id: number;
    name: string;
    sort_name: string;
    volume: number;
    year_began: number;
    series_type: { id: number; name: string };
    genres: { id: number; name: string }[];
  };
  number: string;
  alt_number: string;
  title: string;
  name: string[];
  cover_date: string;
  store_date: string | null;
  foc_date: string | null;
  price: string | null;
  price_currency: string | null;
  rating: { id: number; name: string } | null;
  sku: string;
  isbn: string;
  upc: string;
  page: number | null;
  desc: string;
  image: string | null;
  cover_hash: string;
  arcs: { id: number; name: string; modified: string }[];
  credits: {
    id: number;
    creator: string;
    role: { id: number; name: string }[];
  }[];
  characters: { id: number; name: string; modified: string }[];
  teams: { id: number; name: string; modified: string }[];
  universes: { id: number; name: string; modified: string }[];
  reprints: unknown[];
  variants: unknown[];
  cv_id: number | null;
  gcd_id: number | null;
  resource_url: string;
  modified: string;
}

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
};

@Injectable()
export class MetronService {
  private readonly logger = new Logger(MetronService.name);
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
  };

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly upsertService: UpsertService,
  ) {}

  // ─── API wrapper ───────────────────────────────────────

  private async callApi<T>(
    request: () => Observable<AxiosResponse<T>>,
    context: string,
    maxRetries = 3,
  ): Promise<AxiosResponse<T>> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await firstValueFrom(request());
      } catch (error) {
        const axiosError = error as {
          response?: { status: number; headers: Record<string, string>; data: unknown };
        };
        if (axiosError.response?.status === 429 && attempt < maxRetries) {
          const waitMs = parseRetryAfter(axiosError.response.headers['retry-after']);
          this.logger.warn(
            `[${context}] 429 — Retry-After: ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`,
          );
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }
        throw error;
      }
    }
    // Unreachable — loop always returns or throws — but satisfies TypeScript
    throw new Error('callApi exhausted retries');
  }

  // ─── API calls ─────────────────────────────────────────

  async searchByUpc(upc: string): Promise<MetronSearchResultDto[]> {
    try {
      const response = await this.callApi(
        () => this.httpService.get<MetronPaginatedResponse<MetronIssueListItem>>(
          '/api/issue/',
          { params: { upc } },
        ),
        'searchByUpc',
      );

      return response.data.results.map((item) => ({
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
      }));
    } catch (error) {
      this.handleApiError(error, 'searchByUpc');
    }
  }

  async getIssueDetail(metronId: number): Promise<MetronIssueDetailDto> {
    try {
      const response = await this.callApi(
        () => this.httpService.get<MetronIssueDetail>(`/api/issue/${metronId}/`),
        'getIssueDetail',
      );

      const issue = response.data;
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
      };
    } catch (error) {
      this.handleApiError(error, 'getIssueDetail');
    }
  }

  async importIssue(metronId: number): Promise<{ comicId: number }> {
    // Check for duplicate
    const existing = await this.prisma.comic.findUnique({
      where: { metronId },
    });
    if (existing) {
      throw new ConflictException(
        `Comic with Metron ID ${metronId} already exists (comic #${existing.id}).`,
      );
    }

    // Fetch full detail from Metron
    const detail = await this.getIssueDetail(metronId);

    // Auto-generate a unique negative itemId for Metron-sourced comics
    const itemId = BigInt(-Date.now()) - BigInt(Math.floor(Math.random() * 10000));

    // ── Publisher ──
    const publisherRecord = await this.upsertService.upsertPublisher(
      detail.publisher.name,
    );

    // ── Series ──
    const seriesRecord = await this.upsertService.upsertSeries(
      detail.series.name,
      publisherRecord.id,
    );

    // ── Parse price ──
    let coverPriceCents: number | null = null;
    if (detail.price) {
      const parsed = parseFloat(detail.price);
      if (!isNaN(parsed)) {
        coverPriceCents = Math.round(parsed * 100);
      }
    }

    // ── Extract year from cover_date ──
    let year: number | null = null;
    if (detail.coverDate) {
      const parsed = new Date(detail.coverDate);
      if (!isNaN(parsed.getTime())) {
        year = parsed.getFullYear();
      }
    }

    // ── Construct title ──
    const title = detail.title
      ? detail.title
      : `${detail.series.name} #${detail.number}`;

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
    });

    // ── Story Arcs ──
    for (const arc of detail.arcs) {
      const arcRecord = await this.upsertService.upsertStoryArc(arc.name);
      await this.prisma.comicStoryArc.create({
        data: { comicId: comic.id, storyArcId: arcRecord.id },
      });
    }

    // ── Credits / Creators ──
    for (const credit of detail.credits) {
      const creatorRecord = await this.upsertService.upsertCreator(
        credit.creator,
      );
      for (const role of credit.role) {
        const mappedRole = mapMetronRole(role.name);
        if (!mappedRole) continue;

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
        });
      }
    }

    // ── Characters ──
    for (const char of detail.characters) {
      const character = await this.upsertService.upsertCharacter(char.name);
      await this.prisma.comicCharacter.upsert({
        where: {
          comicId_characterId: {
            comicId: comic.id,
            characterId: character.id,
          },
        },
        create: { comicId: comic.id, characterId: character.id },
        update: {},
      });
    }

    // ── Genres (from series) ──
    for (const genre of detail.series.genres) {
      const genreRecord = await this.upsertService.upsertGenre(genre.name);
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
      });
    }

    this.logger.log(
      `Imported Metron issue #${metronId} as comic #${comic.id}: "${title}"`,
    );

    return { comicId: comic.id };
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
    };
  }

  stopSync(): MetronSyncStatusDto {
    if (!this.syncState.running) {
      return this.getSyncStatus();
    }
    this.syncState.cancelRequested = true;
    return this.getSyncStatus();
  }

  async startSync(): Promise<MetronSyncStatusDto> {
    if (this.syncState.running) {
      throw new ConflictException('A sync is already in progress.');
    }
    const comics = await this.prisma.comic.findMany({
      where: { barcode: { not: null }, metronId: null },
      select: { id: true, barcode: true },
    });
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
    });
    this.runSync(comics).catch((err) => {
      this.logger.error('Sync crashed unexpectedly', err);
      this.syncState.running = false;
      this.syncState.completedAt = new Date();
    });
    return this.getSyncStatus();
  }

  private async runSync(
    comics: { id: number; barcode: string | null }[],
  ): Promise<void> {
    for (const comic of comics) {
      if (this.syncState.cancelRequested) {
        this.syncState.cancelled = true;
        break;
      }
      if (!comic.barcode) {
        this.syncState.skipped++;
        this.syncState.processed++;
        continue;
      }
      try {
        const res = await this.callApi(
          () => this.httpService.get<MetronPaginatedResponse<MetronIssueListItem>>(
            '/api/issue/',
            { params: { upc: comic.barcode } },
          ),
          `runSync:comic#${comic.id}`,
          5,
        );
        if (res.data.count > 0 && res.data.results.length > 0) {
          const item = res.data.results[0];
          const existing = await this.prisma.comic.findUnique({
            where: { id: comic.id },
            select: { coverDate: true, volume: true, year: true },
          });
          await this.prisma.comic.update({
            where: { id: comic.id },
            data: {
              metronId: item.id,
              coverImageUrl: item.image ?? undefined,
              storeDate: item.store_date ? new Date(item.store_date) : undefined,
              coverDate:
                !existing?.coverDate && item.cover_date
                  ? item.cover_date
                  : undefined,
              volume:
                !existing?.volume && item.series.volume
                  ? String(item.series.volume)
                  : undefined,
              year:
                !existing?.year && item.series.year_began
                  ? item.series.year_began
                  : undefined,
            },
          });
          this.syncState.found++;
        } else {
          this.syncState.skipped++;
        }
      } catch (err) {
        this.logger.warn(`Sync failed for comic ${comic.id}: ${err}`);
        this.syncState.failed++;
      }
      this.syncState.processed++;
    }
    this.syncState.running = false;
    this.syncState.completedAt = new Date();
    this.logger.log(
      `Sync complete: ${this.syncState.found} found, ${this.syncState.skipped} skipped, ${this.syncState.failed} failed`,
    );
  }

  // ─── Error handling ────────────────────────────────────

  private handleApiError(error: unknown, method: string): never {
    const axiosError = error as {
      response?: { status: number; headers: Record<string, string>; data: unknown };
      message?: string;
    };

    if (axiosError.response) {
      const status = axiosError.response.status;
      this.logger.error(
        `Metron API error in ${method}: ${status} — ${JSON.stringify(axiosError.response.data)}`,
      );
      if (status === 401) {
        throw new HttpException(
          'Metron API authentication failed. Check METRON_USERNAME and METRON_PASSWORD.',
          HttpStatus.UNAUTHORIZED,
        );
      }
      if (status === 404) {
        throw new HttpException(
          'Issue not found on Metron.',
          HttpStatus.NOT_FOUND,
        );
      }
      if (status === 429) {
        const retryAfter = axiosError.response.headers?.['retry-after'];
        throw new HttpException(
          retryAfter
            ? `Metron API rate limit exceeded. Retry after ${retryAfter}s.`
            : 'Metron API rate limit exceeded. Please wait and try again.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw new HttpException(
        `Metron API returned ${status}`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    this.logger.error(
      `Metron API error in ${method}: ${axiosError.message ?? error}`,
    );
    throw new HttpException(
      'Failed to reach Metron API.',
      HttpStatus.BAD_GATEWAY,
    );
  }
}

// ─── Helpers ─────────────────────────────────────────────

function mapMetronRole(roleName: string): CreatorRole | null {
  const key = roleName.toLowerCase().trim();
  return ROLE_MAP[key] ?? null;
}

function parseRetryAfter(header: string | undefined): number {
  if (!header) return 60_000;
  const seconds = parseInt(header, 10);
  if (!isNaN(seconds)) return seconds * 1000;
  const date = Date.parse(header);
  if (!isNaN(date)) return Math.max(0, date - Date.now());
  return 60_000;
}
