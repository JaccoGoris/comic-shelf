import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@comic-shelf/db';
import { CollectionType, CreatorRole } from '@prisma/client';
import { UpsertService } from '../shared/upsert.service';

interface RawComic {
  'Item Id': number | null;
  Barcode: number | string | null;
  Title: string;
  Synopsis: string | null;
  'Cover Date': string | null;
  Publisher: string | null;
  'Issue Number': string | null;
  'Legacy Number': string | null;
  Volume: string | null;
  Month: string | null;
  Year: number | null;
  'Variant Number': string | null;
  'Cover Letter': string | null;
  'Purchase Type': string | null;
  Attributes: string | null;
  Country: string | null;
  Printing: string | null;
  'Print Run': number | null;
  'Print Order Ratio': string | null;
  'Cover Price': string | null;
  'Cover Exclusive': string | null;
  Era: string | null;
  Genre: string | null;
  Subgenre: string | null;
  Language: string | null;
  'Type of Comic': string | null;
  Characters: string | null;
  Series: string | null;
  'Story Arc': string | null;
  'Number of Pages': number | null;
  'Created By': string | null;
  Writer: string | null;
  Artist: string | null;
  Penciller: string | null;
  Inker: string | null;
  Colorist: string | null;
  'Cover Artist': string | null;
  Letterer: string | null;
  Editor: string | null;
  Preordered: boolean;
  Quantity: number | null;
  'Loaned To': string | null;
  'Estimated Value': string | null;
  'Purchase Price': string | null;
  'Purchase Date': string | null;
  'Purchased From': string | null;
  'For Sale': boolean;
  'Sold For': string | null;
  'Personal Rating': string | null;
  'Signed By': string | null;
  Condition: string | null;
  Read: boolean;
  'Graded By': string | null;
  'Graded Rating': string | null;
  'Graded Label Type': string | null;
  'Graded Serial Number': string | null;
  'Grader Notes': string | null;
  'Page Quality': string | null;
  'Storage Location': string | null;
  Notes: string | null;
  Owner: string | null;
  Collection: string | null;
  'Date Added': string | null;
  'Collection/Wishlist': string | null;
}

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly upsertService: UpsertService,
  ) {}

  async importComics(rawEntries: unknown[]) {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Process in batches for better performance
    const BATCH_SIZE = 50;
    for (let i = 0; i < rawEntries.length; i += BATCH_SIZE) {
      const batch = rawEntries.slice(i, i + BATCH_SIZE);

      for (const entry of batch) {
        try {
          const raw = entry as RawComic;

          if (!raw['Item Id'] || !raw.Title) {
            skipped++;
            continue;
          }

          const itemId = BigInt(Math.round(raw['Item Id']));

          // Check if already imported
          const existing = await this.prisma.comic.findUnique({
            where: { itemId },
          });
          if (existing) {
            skipped++;
            continue;
          }

          await this.importSingleComic(raw, itemId);
          imported++;
        } catch (err) {
          const raw = entry as RawComic;
          const msg = `Failed to import "${raw?.Title ?? 'unknown'}" (Item Id: ${raw?.['Item Id'] ?? '?'}): ${err instanceof Error ? err.message : String(err)}`;
          this.logger.warn(msg);
          errors.push(msg);
        }
      }
    }

    this.logger.log(
      `Import complete: ${imported} imported, ${skipped} skipped, ${errors.length} errors`,
    );

    return { imported, skipped, errors };
  }

  private async importSingleComic(raw: RawComic, itemId: bigint) {
    // ── Publisher ──
    const publisherRecord = raw.Publisher
      ? await this.upsertService.upsertPublisher(raw.Publisher)
      : null;

    // ── Series ──
    const seriesRecord = raw.Series
      ? await this.upsertService.upsertSeries(
          raw.Series,
          publisherRecord?.id ?? null,
        )
      : null;

    // ── Parse prices ──
    const coverPrice = parsePrice(raw['Cover Price']);
    const purchasePrice = parsePrice(raw['Purchase Price']);

    // ── Parse dates ──
    const purchaseDate = parseDate(raw['Purchase Date']);
    const dateAdded = parseDate(raw['Date Added']);

    // ── Parse barcode ──
    const barcode = raw.Barcode
      ? typeof raw.Barcode === 'number'
        ? BigInt(Math.round(raw.Barcode)).toString()
        : String(raw.Barcode)
      : null;

    // ── Collection/Wishlist ──
    const collectionWishlist = parseCollectionType(
      raw['Collection/Wishlist'],
    );

    // ── Create comic ──
    const comic = await this.prisma.comic.create({
      data: {
        itemId,
        barcode,
        title: raw.Title,
        synopsis: raw.Synopsis ?? null,
        coverDate: raw['Cover Date'] ?? null,
        issueNumber: raw['Issue Number'] ?? null,
        legacyNumber: raw['Legacy Number'] ?? null,
        volume: raw.Volume ?? null,
        month: raw.Month ?? null,
        year: raw.Year ? Math.round(raw.Year) : null,
        variantNumber: raw['Variant Number'] ?? null,
        coverLetter: raw['Cover Letter'] ?? null,
        purchaseType: raw['Purchase Type'] ?? null,
        attributes: raw.Attributes ?? null,
        country: raw.Country ?? null,
        printing: raw.Printing ?? null,
        printRun: raw['Print Run'] ? Math.round(raw['Print Run']) : null,
        printOrderRatio: raw['Print Order Ratio'] ?? null,
        coverPriceRaw: raw['Cover Price'] ?? null,
        coverPriceCents: coverPrice.cents,
        coverPriceCurrency: coverPrice.currency,
        coverExclusive: raw['Cover Exclusive'] ?? null,
        era: raw.Era ?? null,
        language: raw.Language ?? null,
        typeOfComic: raw['Type of Comic'] ?? null,
        numberOfPages: raw['Number of Pages']
          ? Math.round(raw['Number of Pages'])
          : null,
        preordered: raw.Preordered ?? false,
        quantity: raw.Quantity ? Math.round(raw.Quantity) : 1,
        loanedTo: raw['Loaned To'] ?? null,
        estimatedValue: raw['Estimated Value'] ?? null,
        purchasePriceRaw: raw['Purchase Price'] ?? null,
        purchasePriceCents: purchasePrice.cents,
        purchasePriceCurrency: purchasePrice.currency,
        purchaseDate,
        purchasedFrom: raw['Purchased From'] ?? null,
        forSale: raw['For Sale'] ?? false,
        soldFor: raw['Sold For'] ?? null,
        personalRating: raw['Personal Rating'] ?? null,
        signedBy: raw['Signed By'] ?? null,
        condition: raw.Condition ?? null,
        read: raw.Read ?? false,
        gradedBy: raw['Graded By'] ?? null,
        gradedRating: raw['Graded Rating'] ?? null,
        gradedLabelType: raw['Graded Label Type'] ?? null,
        gradedSerialNumber: raw['Graded Serial Number'] ?? null,
        graderNotes: raw['Grader Notes'] ?? null,
        pageQuality: raw['Page Quality'] ?? null,
        storageLocation: raw['Storage Location'] ?? null,
        notes: raw.Notes ?? null,
        owner: raw.Owner ?? null,
        collectionName: raw.Collection ?? null,
        dateAdded,
        collectionWishlist,
        publisherId: publisherRecord?.id ?? null,
        seriesId: seriesRecord?.id ?? null,
      },
    });

    // ── Story Arcs ──
    if (raw['Story Arc']) {
      const arcNames = splitAndTrim(raw['Story Arc']);
      for (const name of arcNames) {
        const arc = await this.upsertService.upsertStoryArc(name);
        await this.prisma.comicStoryArc.create({
          data: { comicId: comic.id, storyArcId: arc.id },
        });
      }
    }

    // ── Creators ──
    const creatorFields: Array<{ field: keyof RawComic; role: CreatorRole }> =
      [
        { field: 'Created By', role: 'CREATED_BY' },
        { field: 'Writer', role: 'WRITER' },
        { field: 'Artist', role: 'ARTIST' },
        { field: 'Penciller', role: 'PENCILLER' },
        { field: 'Inker', role: 'INKER' },
        { field: 'Colorist', role: 'COLORIST' },
        { field: 'Cover Artist', role: 'COVER_ARTIST' },
        { field: 'Letterer', role: 'LETTERER' },
        { field: 'Editor', role: 'EDITOR' },
      ];

    for (const { field, role } of creatorFields) {
      const value = raw[field] as string | null;
      if (!value) continue;
      const names = splitAndTrim(value);
      for (const name of names) {
        const creator = await this.upsertService.upsertCreator(name);
        // Avoid duplicate key errors for same creator+role on same comic
        await this.prisma.comicCreator.upsert({
          where: {
            comicId_creatorId_role: {
              comicId: comic.id,
              creatorId: creator.id,
              role,
            },
          },
          create: { comicId: comic.id, creatorId: creator.id, role },
          update: {},
        });
      }
    }

    // ── Characters ──
    if (raw.Characters) {
      const charEntries = splitAndTrim(raw.Characters);
      for (const entry of charEntries) {
        const { name, alias } = parseCharacterName(entry);
        const character = await this.upsertService.upsertCharacter(
          name,
          alias,
        );
        await this.prisma.comicCharacter.create({
          data: { comicId: comic.id, characterId: character.id },
        });
      }
    }

    // ── Genres ──
    if (raw.Genre) {
      const genreNames = splitAndTrim(raw.Genre);
      for (const name of genreNames) {
        const genre = await this.upsertService.upsertGenre(name);
        await this.prisma.comicGenre.upsert({
          where: {
            comicId_genreId_type: {
              comicId: comic.id,
              genreId: genre.id,
              type: 'GENRE',
            },
          },
          create: { comicId: comic.id, genreId: genre.id, type: 'GENRE' },
          update: {},
        });
      }
    }

    if (raw.Subgenre) {
      const subgenreNames = splitAndTrim(raw.Subgenre);
      for (const name of subgenreNames) {
        const genre = await this.upsertService.upsertGenre(name);
        await this.prisma.comicGenre.upsert({
          where: {
            comicId_genreId_type: {
              comicId: comic.id,
              genreId: genre.id,
              type: 'SUBGENRE',
            },
          },
          create: {
            comicId: comic.id,
            genreId: genre.id,
            type: 'SUBGENRE',
          },
          update: {},
        });
      }
    }

    return comic;
  }
}

// ─── Pure helper functions ─────────────────────────────────

function splitAndTrim(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Parse character names like "Iron Man (Tony Stark)" into name + alias.
 * Handles missing closing parens like "Captain America (Steve Rogers"
 */
function parseCharacterName(raw: string): {
  name: string;
  alias: string | null;
} {
  const trimmed = raw.trim();
  const parenOpen = trimmed.indexOf('(');
  if (parenOpen === -1) {
    return { name: trimmed, alias: null };
  }
  const name = trimmed.substring(0, parenOpen).trim();
  let alias = trimmed.substring(parenOpen + 1).trim();
  // Remove trailing paren if present
  if (alias.endsWith(')')) {
    alias = alias.slice(0, -1).trim();
  }
  return { name, alias: alias || null };
}

/**
 * Parse price strings like "en_US 399" or "en_BE 799"
 * Returns { cents, currency }
 */
function parsePrice(raw: string | null): {
  cents: number | null;
  currency: string | null;
} {
  if (!raw) return { cents: null, currency: null };
  const trimmed = raw.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length !== 2) return { cents: null, currency: null };

  const [locale, centsStr] = parts;
  const cents = parseInt(centsStr, 10);
  if (isNaN(cents)) return { cents: null, currency: null };

  // Map locale prefix to currency code
  const currencyMap: Record<string, string> = {
    en_US: 'USD',
    en_GB: 'GBP',
    en_BE: 'EUR',
    en_CA: 'CAD',
    en_AU: 'AUD',
  };
  const currency = currencyMap[locale] ?? locale;

  return { cents, currency };
}

function parseDate(raw: string | null): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function parseCollectionType(
  raw: string | null,
): CollectionType | null {
  if (!raw) return null;
  const upper = raw.trim().toUpperCase();
  if (upper === 'COLLECTION') return 'COLLECTION';
  if (upper === 'WISHLIST') return 'WISHLIST';
  return null;
}
