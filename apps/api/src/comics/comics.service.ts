import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@comic-shelf/db';
import { Prisma } from '@prisma/client';

interface FindAllParams {
  page: number;
  limit: number;
  search?: string;
  publisherId?: number;
  seriesId?: number;
  creatorId?: number;
  characterId?: number;
  genreId?: number;
  read?: boolean;
  collectionWishlist?: 'COLLECTION' | 'WISHLIST';
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const COMIC_LIST_INCLUDE = {
  publisher: true,
  series: { include: { publisher: true } },
} satisfies Prisma.ComicInclude;

const COMIC_DETAIL_INCLUDE = {
  publisher: true,
  series: { include: { publisher: true } },
  storyArcs: { include: { storyArc: true } },
  creators: { include: { creator: true } },
  characters: { include: { character: true } },
  genres: { include: { genre: true } },
} satisfies Prisma.ComicInclude;

@Injectable()
export class ComicsService {
  constructor(private readonly prisma: PrismaService) {}

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
    } = params;

    const where: Prisma.ComicWhereInput = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { synopsis: { contains: search, mode: 'insensitive' } },
        { series: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (publisherId) where.publisherId = publisherId;
    if (seriesId) where.seriesId = seriesId;
    if (read !== undefined) where.read = read;
    if (collectionWishlist) where.collectionWishlist = collectionWishlist;

    if (creatorId) {
      where.creators = { some: { creatorId } };
    }
    if (characterId) {
      where.characters = { some: { characterId } };
    }
    if (genreId) {
      where.genres = { some: { genreId } };
    }

    const allowedSortFields: Record<string, string> = {
      title: 'title',
      year: 'year',
      dateAdded: 'dateAdded',
      purchaseDate: 'purchaseDate',
      issueNumber: 'issueNumber',
    };
    const orderField = allowedSortFields[sortBy] ?? 'dateAdded';

    const [data, total] = await Promise.all([
      this.prisma.comic.findMany({
        where,
        include: COMIC_LIST_INCLUDE,
        orderBy: { [orderField]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.comic.count({ where }),
    ]);

    return {
      data: data.map(serializeComic),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number) {
    const comic = await this.prisma.comic.findUnique({
      where: { id },
      include: COMIC_DETAIL_INCLUDE,
    });

    if (!comic) {
      throw new NotFoundException(`Comic with id ${id} not found`);
    }

    return serializeComicDetail(comic);
  }

  async remove(id: number) {
    await this.prisma.comic.delete({ where: { id } });
  }
}

// BigInt can't be serialized by JSON.stringify, so convert to string
function serializeComic(comic: Record<string, unknown>) {
  return {
    ...comic,
    itemId: String(comic['itemId']),
  };
}

function serializeComicDetail(comic: Record<string, unknown>) {
  const serialized = serializeComic(comic);
  const storyArcs = comic['storyArcs'] as Array<{ storyArc: unknown }>;
  const creators = comic['creators'] as Array<{
    role: string;
    creator: unknown;
  }>;
  const characters = comic['characters'] as Array<{
    character: unknown;
  }>;
  const genres = comic['genres'] as Array<{
    type: string;
    genre: unknown;
  }>;

  return {
    ...serialized,
    storyArcs: storyArcs?.map((sa) => sa.storyArc) ?? [],
    creators:
      creators?.map((c) => ({ role: c.role, creator: c.creator })) ?? [],
    characters: characters?.map((c) => c.character) ?? [],
    genres: genres?.map((g) => ({ type: g.type, genre: g.genre })) ?? [],
  };
}
