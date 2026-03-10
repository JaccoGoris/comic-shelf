import { Injectable, Logger } from '@nestjs/common'
import { PrismaService, Prisma } from '@comic-shelf/db'
import type { BackupComicDto, BackupEnvelope } from '@comic-shelf/shared-types'
import { CURRENT_BACKUP_VERSION } from './backup-migrations'
import { UpsertService } from '../shared/upsert.service'

const COMIC_DETAIL_INCLUDE = {
  publisher: true,
  series: { include: { publisher: true } },
  storyArcs: { include: { storyArc: true } },
  creators: { include: { creator: true } },
  characters: { include: { character: true } },
  genres: { include: { genre: true } },
} satisfies Prisma.ComicInclude

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly upsertService: UpsertService
  ) {}

  async exportAll(): Promise<BackupEnvelope> {
    const comics = await this.prisma.comic.findMany({
      include: COMIC_DETAIL_INCLUDE,
      orderBy: { dateAdded: 'asc' },
    })

    const comicDtos: BackupComicDto[] = comics.map((comic) => ({
      itemId: String(comic.itemId),
      metronId: comic.metronId,
      barcode: comic.barcode,
      title: comic.title,
      synopsis: comic.synopsis,
      issueNumber: comic.issueNumber,
      legacyNumber: comic.legacyNumber,
      volume: comic.volume,
      month: comic.month,
      year: comic.year,
      variantNumber: comic.variantNumber,
      coverLetter: comic.coverLetter,
      purchaseType: comic.purchaseType,
      attributes: comic.attributes,
      country: comic.country,
      printing: comic.printing,
      printRun: comic.printRun,
      printOrderRatio: comic.printOrderRatio,
      coverDate: comic.coverDate,
      coverPriceRaw: comic.coverPriceRaw,
      coverPriceCents: comic.coverPriceCents,
      coverPriceCurrency: comic.coverPriceCurrency,
      coverExclusive: comic.coverExclusive,
      coverImageUrl: comic.coverImageUrl,
      era: comic.era,
      language: comic.language,
      typeOfComic: comic.typeOfComic,
      numberOfPages: comic.numberOfPages,
      preordered: comic.preordered,
      quantity: comic.quantity,
      loanedTo: comic.loanedTo,
      estimatedValue: comic.estimatedValue,
      purchasePriceRaw: comic.purchasePriceRaw,
      purchasePriceCents: comic.purchasePriceCents,
      purchasePriceCurrency: comic.purchasePriceCurrency,
      purchaseDate: comic.purchaseDate?.toISOString() ?? null,
      purchasedFrom: comic.purchasedFrom,
      forSale: comic.forSale,
      soldFor: comic.soldFor,
      personalRating: comic.personalRating,
      signedBy: comic.signedBy,
      condition: comic.condition,
      read: comic.read,
      gradedBy: comic.gradedBy,
      gradedRating: comic.gradedRating,
      gradedLabelType: comic.gradedLabelType,
      gradedSerialNumber: comic.gradedSerialNumber,
      graderNotes: comic.graderNotes,
      pageQuality: comic.pageQuality,
      storageLocation: comic.storageLocation,
      notes: comic.notes,
      owner: comic.owner,
      collectionName: comic.collectionName,
      dateAdded: comic.dateAdded?.toISOString() ?? null,
      storeDate: comic.storeDate?.toISOString() ?? null,
      createdAt: comic.createdAt.toISOString(),
      updatedAt: comic.updatedAt.toISOString(),
      collectionWishlist: comic.collectionWishlist,
      publisher: comic.publisher?.name ?? null,
      series: comic.series?.name ?? null,
      creators: comic.creators.map((c) => ({
        name: c.creator.name,
        role: c.role,
      })),
      characters: comic.characters.map((c) => ({
        name: c.character.name,
        alias: c.character.alias,
      })),
      storyArcs: comic.storyArcs.map((sa) => sa.storyArc.name),
      genres: comic.genres.map((g) => ({ name: g.genre.name, type: g.type })),
    }))

    return {
      version: CURRENT_BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      comics: comicDtos,
    }
  }

  async importBackup(entries: BackupComicDto[]) {
    let created = 0
    let updated = 0
    const errors: string[] = []

    for (const entry of entries) {
      try {
        if (!entry.itemId || !entry.title) {
          errors.push(`Skipping entry with missing itemId or title`)
          continue
        }

        const itemId = BigInt(entry.itemId)

        const existing = await this.prisma.comic.findUnique({
          where: { itemId },
        })

        const publisherRecord = entry.publisher
          ? await this.upsertService.upsertPublisher(entry.publisher)
          : null

        const seriesRecord = entry.series
          ? await this.upsertService.upsertSeries(
              entry.series,
              publisherRecord?.id ?? null
            )
          : null

        const purchaseDate = entry.purchaseDate
          ? new Date(entry.purchaseDate)
          : null
        const dateAdded = entry.dateAdded ? new Date(entry.dateAdded) : null
        const storeDate = entry.storeDate ? new Date(entry.storeDate) : null
        const createdAt = entry.createdAt
          ? new Date(entry.createdAt)
          : new Date()

        const scalarData = {
          itemId,
          metronId: entry.metronId,
          barcode: entry.barcode,
          title: entry.title,
          synopsis: entry.synopsis,
          issueNumber: entry.issueNumber,
          legacyNumber: entry.legacyNumber,
          volume: entry.volume,
          month: entry.month,
          year: entry.year,
          variantNumber: entry.variantNumber,
          coverLetter: entry.coverLetter,
          purchaseType: entry.purchaseType,
          attributes: entry.attributes,
          country: entry.country,
          printing: entry.printing,
          printRun: entry.printRun,
          printOrderRatio: entry.printOrderRatio,
          coverDate: entry.coverDate,
          coverPriceRaw: entry.coverPriceRaw,
          coverPriceCents: entry.coverPriceCents,
          coverPriceCurrency: entry.coverPriceCurrency,
          coverExclusive: entry.coverExclusive,
          coverImageUrl: entry.coverImageUrl,
          era: entry.era,
          language: entry.language,
          typeOfComic: entry.typeOfComic,
          numberOfPages: entry.numberOfPages,
          preordered: entry.preordered ?? false,
          quantity: entry.quantity ?? 1,
          loanedTo: entry.loanedTo,
          estimatedValue: entry.estimatedValue,
          purchasePriceRaw: entry.purchasePriceRaw,
          purchasePriceCents: entry.purchasePriceCents,
          purchasePriceCurrency: entry.purchasePriceCurrency,
          purchaseDate,
          purchasedFrom: entry.purchasedFrom,
          forSale: entry.forSale ?? false,
          soldFor: entry.soldFor,
          personalRating: entry.personalRating,
          signedBy: entry.signedBy,
          condition: entry.condition,
          read: entry.read ?? false,
          gradedBy: entry.gradedBy,
          gradedRating: entry.gradedRating,
          gradedLabelType: entry.gradedLabelType,
          gradedSerialNumber: entry.gradedSerialNumber,
          graderNotes: entry.graderNotes,
          pageQuality: entry.pageQuality,
          storageLocation: entry.storageLocation,
          notes: entry.notes,
          owner: entry.owner,
          collectionName: entry.collectionName,
          dateAdded,
          storeDate,
          collectionWishlist: entry.collectionWishlist,
          publisherId: publisherRecord?.id ?? null,
          seriesId: seriesRecord?.id ?? null,
        }

        await this.prisma.$transaction(async (tx) => {
          let comicId: number

          if (existing) {
            await tx.comic.update({
              where: { id: existing.id },
              data: scalarData,
            })
            comicId = existing.id
            // Clear existing relations to replace them
            await tx.comicCreator.deleteMany({ where: { comicId } })
            await tx.comicCharacter.deleteMany({ where: { comicId } })
            await tx.comicStoryArc.deleteMany({ where: { comicId } })
            await tx.comicGenre.deleteMany({ where: { comicId } })
          } else {
            const comic = await tx.comic.create({
              data: { ...scalarData, createdAt },
            })
            comicId = comic.id
          }

          // Creators
          for (const c of entry.creators ?? []) {
            const creator = await this.upsertService.upsertCreator(c.name)
            await tx.comicCreator.create({
              data: { comicId, creatorId: creator.id, role: c.role },
            })
          }

          // Characters
          for (const c of entry.characters ?? []) {
            const character = await this.upsertService.upsertCharacter(
              c.name,
              c.alias
            )
            await tx.comicCharacter.create({
              data: { comicId, characterId: character.id },
            })
          }

          // Story arcs
          for (const name of entry.storyArcs ?? []) {
            const arc = await this.upsertService.upsertStoryArc(name)
            await tx.comicStoryArc.create({
              data: { comicId, storyArcId: arc.id },
            })
          }

          // Genres
          for (const g of entry.genres ?? []) {
            const genre = await this.upsertService.upsertGenre(g.name)
            await tx.comicGenre.create({
              data: { comicId, genreId: genre.id, type: g.type },
            })
          }
        })

        if (existing) {
          updated++
        } else {
          created++
        }
      } catch (err) {
        const msg = `Failed to import "${entry?.title ?? 'unknown'}" (itemId: ${
          entry?.itemId ?? '?'
        }): ${err instanceof Error ? err.message : String(err)}`
        this.logger.warn(msg)
        errors.push(msg)
      }
    }

    this.logger.log(
      `Backup import complete: ${created} created, ${updated} updated, ${errors.length} errors`
    )

    return { created, updated, errors }
  }
}
