import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@comic-shelf/db'
import { Prisma } from '@prisma/client'
import { UpsertService } from '../shared/upsert.service'
import type { UpdateComicDto } from '@comic-shelf/shared-types'

interface FindAllParams {
  page: number
  limit: number
  search?: string
  publisherId?: number
  seriesId?: number
  creatorId?: number
  characterId?: number
  genreId?: number
  read?: boolean
  collectionWishlist?: 'COLLECTION' | 'WISHLIST'
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

const COMIC_LIST_INCLUDE = {
  publisher: true,
  series: { include: { publisher: true } },
} satisfies Prisma.ComicInclude

const COMIC_DETAIL_INCLUDE = {
  publisher: true,
  series: { include: { publisher: true } },
  storyArcs: { include: { storyArc: true } },
  creators: { include: { creator: true } },
  characters: { include: { character: true } },
  genres: { include: { genre: true } },
} satisfies Prisma.ComicInclude

@Injectable()
export class ComicsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly upsertService: UpsertService,
  ) {}

  async findAll(params: FindAllParams) {
    const {
      page,
      limit,
      search,
      publisherId,
      seriesId,
      creatorId,
      characterId,
      genreId,
      read,
      collectionWishlist,
      sortBy,
      sortOrder,
    } = params

    const where: Prisma.ComicWhereInput = {}

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { synopsis: { contains: search, mode: 'insensitive' } },
        { series: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    if (publisherId) where.publisherId = publisherId
    if (seriesId) where.seriesId = seriesId
    if (read !== undefined) where.read = read
    if (collectionWishlist) where.collectionWishlist = collectionWishlist

    if (creatorId) {
      where.creators = { some: { creatorId } }
    }
    if (characterId) {
      where.characters = { some: { characterId } }
    }
    if (genreId) {
      where.genres = { some: { genreId } }
    }

    const allowedSortFields: Record<string, string> = {
      title: 'title',
      year: 'year',
      dateAdded: 'dateAdded',
      purchaseDate: 'purchaseDate',
      issueNumber: 'issueNumber',
    }

    if (sortBy === 'volume') {
      return this.findAllSortedByVolume(where, page, limit)
    }

    const orderField = allowedSortFields[sortBy] ?? 'dateAdded'
    const orderBy = [{ [orderField]: sortOrder }]

    const [data, total] = await Promise.all([
      this.prisma.comic.findMany({
        where,
        include: COMIC_LIST_INCLUDE,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.comic.count({ where }),
    ])

    return {
      data: data.map(serializeComic),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  private async findAllSortedByVolume(
    where: Prisma.ComicWhereInput,
    page: number,
    limit: number,
  ) {
    // Get filtered IDs via Prisma (respects all where filters), then sort with raw SQL
    // for proper numeric ordering of volume and issue_number string columns.
    const [allFiltered, total] = await Promise.all([
      this.prisma.comic.findMany({ where, select: { id: true } }),
      this.prisma.comic.count({ where }),
    ])

    const filteredIds = allFiltered.map((r) => r.id)
    if (filteredIds.length === 0) {
      return { data: [], total: 0, page, limit, totalPages: 0 }
    }

    const sortedIds = await this.prisma.$queryRaw<{ id: number }[]>`
      SELECT c.id FROM comics c
      LEFT JOIN series s ON c.series_id = s.id
      WHERE c.id = ANY(${filteredIds})
      ORDER BY
        s.name ASC NULLS LAST,
        CASE WHEN c.volume ~ '^[0-9]+$' THEN CAST(c.volume AS INTEGER) END ASC NULLS LAST,
        c.volume ASC NULLS LAST,
        CASE WHEN c.issue_number ~ '^[0-9]+(\\..*)?$' THEN CAST(SPLIT_PART(c.issue_number, '.', 1) AS INTEGER) END ASC NULLS LAST,
        c.issue_number ASC NULLS LAST
      OFFSET ${(page - 1) * limit}
      LIMIT ${limit}
    `

    const pageIds = sortedIds.map((r) => r.id)
    const data =
      pageIds.length > 0
        ? await this.prisma.comic.findMany({
            where: { id: { in: pageIds } },
            include: COMIC_LIST_INCLUDE,
          })
        : []

    // Preserve the SQL sort order
    const idOrder = new Map(pageIds.map((id, i) => [id, i]))
    data.sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0))

    return {
      data: data.map(serializeComic),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async findOne(id: number) {
    const comic = await this.prisma.comic.findUnique({
      where: { id },
      include: COMIC_DETAIL_INCLUDE,
    })

    if (!comic) {
      throw new NotFoundException(`Comic with id ${id} not found`)
    }

    return serializeComicDetail(comic)
  }

  async update(id: number, dto: UpdateComicDto) {
    const comic = await this.prisma.comic.findUnique({ where: { id } })
    if (!comic) {
      throw new NotFoundException(`Comic with id ${id} not found`)
    }

    const scalarData: Prisma.ComicUpdateInput = {}

    // Scalar fields
    if (dto.title !== undefined) scalarData.title = dto.title
    if (dto.synopsis !== undefined) scalarData.synopsis = dto.synopsis
    if (dto.issueNumber !== undefined) scalarData.issueNumber = dto.issueNumber
    if (dto.volume !== undefined) scalarData.volume = dto.volume
    if (dto.year !== undefined) scalarData.year = dto.year
    if (dto.coverDate !== undefined) scalarData.coverDate = dto.coverDate
    if (dto.barcode !== undefined) scalarData.barcode = dto.barcode
    if (dto.legacyNumber !== undefined)
      scalarData.legacyNumber = dto.legacyNumber
    if (dto.variantNumber !== undefined)
      scalarData.variantNumber = dto.variantNumber
    if (dto.coverLetter !== undefined) scalarData.coverLetter = dto.coverLetter
    if (dto.era !== undefined) scalarData.era = dto.era
    if (dto.language !== undefined) scalarData.language = dto.language
    if (dto.country !== undefined) scalarData.country = dto.country
    if (dto.typeOfComic !== undefined) scalarData.typeOfComic = dto.typeOfComic
    if (dto.numberOfPages !== undefined)
      scalarData.numberOfPages = dto.numberOfPages
    if (dto.printing !== undefined) scalarData.printing = dto.printing
    if (dto.coverPriceCents !== undefined)
      scalarData.coverPriceCents = dto.coverPriceCents
    if (dto.coverPriceCurrency !== undefined)
      scalarData.coverPriceCurrency = dto.coverPriceCurrency
    if (dto.read !== undefined) scalarData.read = dto.read
    if (dto.preordered !== undefined) scalarData.preordered = dto.preordered
    if (dto.forSale !== undefined) scalarData.forSale = dto.forSale
    if (dto.quantity !== undefined) scalarData.quantity = dto.quantity
    if (dto.condition !== undefined) scalarData.condition = dto.condition
    if (dto.storageLocation !== undefined)
      scalarData.storageLocation = dto.storageLocation
    if (dto.loanedTo !== undefined) scalarData.loanedTo = dto.loanedTo
    if (dto.signedBy !== undefined) scalarData.signedBy = dto.signedBy
    if (dto.personalRating !== undefined)
      scalarData.personalRating = dto.personalRating
    if (dto.purchasePriceCents !== undefined)
      scalarData.purchasePriceCents = dto.purchasePriceCents
    if (dto.purchasePriceCurrency !== undefined)
      scalarData.purchasePriceCurrency = dto.purchasePriceCurrency
    if (dto.purchaseDate !== undefined)
      scalarData.purchaseDate = dto.purchaseDate
        ? new Date(dto.purchaseDate)
        : null
    if (dto.purchasedFrom !== undefined)
      scalarData.purchasedFrom = dto.purchasedFrom
    if (dto.collectionWishlist !== undefined)
      scalarData.collectionWishlist = dto.collectionWishlist
    if (dto.notes !== undefined) scalarData.notes = dto.notes
    if (dto.gradedBy !== undefined) scalarData.gradedBy = dto.gradedBy
    if (dto.gradedRating !== undefined)
      scalarData.gradedRating = dto.gradedRating
    if (dto.gradedLabelType !== undefined)
      scalarData.gradedLabelType = dto.gradedLabelType
    if (dto.gradedSerialNumber !== undefined)
      scalarData.gradedSerialNumber = dto.gradedSerialNumber
    if (dto.graderNotes !== undefined) scalarData.graderNotes = dto.graderNotes
    if (dto.pageQuality !== undefined) scalarData.pageQuality = dto.pageQuality

    // Publisher
    if (dto.publisher !== undefined) {
      if (dto.publisher) {
        const pub = await this.upsertService.upsertPublisher(dto.publisher.name)
        scalarData.publisher = { connect: { id: pub.id } }
      } else {
        scalarData.publisher = { disconnect: true }
      }
    }

    // Series
    if (dto.series !== undefined) {
      if (dto.series) {
        const publisherId = dto.publisher
          ? (await this.upsertService.upsertPublisher(dto.publisher.name)).id
          : comic.publisherId
        const ser = await this.upsertService.upsertSeries(
          dto.series.name,
          publisherId,
        )
        scalarData.series = { connect: { id: ser.id } }
      } else {
        scalarData.series = { disconnect: true }
      }
    }

    await this.prisma.$transaction(async (tx) => {
      // Update scalar fields
      await tx.comic.update({ where: { id }, data: scalarData })

      // Replace creators
      if (dto.creators !== undefined) {
        await tx.comicCreator.deleteMany({ where: { comicId: id } })
        for (const c of dto.creators) {
          const creator = await this.upsertService.upsertCreator(c.name)
          await tx.comicCreator.create({
            data: { comicId: id, creatorId: creator.id, role: c.role },
          })
        }
      }

      // Replace characters
      if (dto.characters !== undefined) {
        await tx.comicCharacter.deleteMany({ where: { comicId: id } })
        for (const c of dto.characters) {
          const character = await this.upsertService.upsertCharacter(c.name)
          await tx.comicCharacter.create({
            data: { comicId: id, characterId: character.id },
          })
        }
      }

      // Replace story arcs
      if (dto.storyArcs !== undefined) {
        await tx.comicStoryArc.deleteMany({ where: { comicId: id } })
        for (const a of dto.storyArcs) {
          const arc = await this.upsertService.upsertStoryArc(a.name)
          await tx.comicStoryArc.create({
            data: { comicId: id, storyArcId: arc.id },
          })
        }
      }

      // Replace genres
      if (dto.genres !== undefined) {
        await tx.comicGenre.deleteMany({ where: { comicId: id } })
        for (const g of dto.genres) {
          const genre = await this.upsertService.upsertGenre(g.name)
          await tx.comicGenre.create({
            data: { comicId: id, genreId: genre.id, type: g.type },
          })
        }
      }
    })

    return this.findOne(id)
  }

  async remove(id: number) {
    await this.prisma.comic.delete({ where: { id } })
  }
}

// BigInt can't be serialized by JSON.stringify, so convert to string
function serializeComic(comic: Record<string, unknown>) {
  return {
    ...comic,
    itemId: String(comic['itemId']),
  }
}

function serializeComicDetail(comic: Record<string, unknown>) {
  const serialized = serializeComic(comic)
  const storyArcs = comic['storyArcs'] as Array<{ storyArc: unknown }>
  const creators = comic['creators'] as Array<{
    role: string
    creator: unknown
  }>
  const characters = comic['characters'] as Array<{
    character: unknown
  }>
  const genres = comic['genres'] as Array<{
    type: string
    genre: unknown
  }>

  return {
    ...serialized,
    storyArcs: storyArcs?.map((sa) => sa.storyArc) ?? [],
    creators:
      creators?.map((c) => ({ role: c.role, creator: c.creator })) ?? [],
    characters: characters?.map((c) => c.character) ?? [],
    genres: genres?.map((g) => ({ type: g.type, genre: g.genre })) ?? [],
  }
}
