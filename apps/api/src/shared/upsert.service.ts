import { Injectable } from '@nestjs/common'
import { PrismaService } from '@comic-shelf/db'

// Known publisher name variants → canonical name
const PUBLISHER_ALIASES: Record<string, string> = {
  marvel: 'Marvel Comics',
  'marvel comics': 'Marvel Comics',
  dc: 'DC Comics',
  'dc comics': 'DC Comics',
  image: 'Image Comics',
  'image comics': 'Image Comics',
  'dark horse': 'Dark Horse Comics',
  'dark horse comics': 'Dark Horse Comics',
  boom: 'BOOM! Studios',
  'boom! studios': 'BOOM! Studios',
  'boom studios': 'BOOM! Studios',
}

@Injectable()
export class UpsertService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertPublisher(rawName: string) {
    const name = normalizePublisher(rawName)
    return this.prisma.publisher.upsert({
      where: { name },
      create: { name },
      update: {},
    })
  }

  async upsertSeries(
    name: string,
    publisherId: number | null,
    metronSeriesId?: number
  ) {
    const trimmed = name.trim()
    return this.prisma.series.upsert({
      where: {
        name_publisherId: {
          name: trimmed,
          publisherId: publisherId ?? 0,
        },
      },
      create: {
        name: trimmed,
        publisherId,
        metronSeriesId: metronSeriesId ?? null,
      },
      update: metronSeriesId ? { metronSeriesId } : {},
    })
  }

  async upsertStoryArc(name: string) {
    const trimmed = name.trim()
    return this.prisma.storyArc.upsert({
      where: { name: trimmed },
      create: { name: trimmed },
      update: {},
    })
  }

  async upsertCreator(name: string) {
    const trimmed = name.trim()
    return this.prisma.creator.upsert({
      where: { name: trimmed },
      create: { name: trimmed },
      update: {},
    })
  }

  async upsertCharacter(name: string, alias: string | null = null) {
    const trimmed = name.trim()
    return this.prisma.character.upsert({
      where: { name: trimmed },
      create: { name: trimmed, alias },
      update: alias ? { alias } : {},
    })
  }

  async upsertGenre(name: string) {
    const trimmed = name.trim()
    return this.prisma.genre.upsert({
      where: { name: trimmed },
      create: { name: trimmed },
      update: {},
    })
  }
}

function normalizePublisher(raw: string): string {
  const trimmed = raw.trim()
  const key = trimmed.toLowerCase()
  return PUBLISHER_ALIASES[key] ?? trimmed
}
