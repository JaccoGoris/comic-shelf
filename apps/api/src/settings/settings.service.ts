import { Injectable } from '@nestjs/common'
import { PrismaService } from '@comic-shelf/db'
import type { UpdateSiteSettingsDto } from '@comic-shelf/shared-types'

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings() {
    return this.prisma.siteSettings.upsert({
      where: { id: 1 },
      create: { id: 1 },
      update: {},
    })
  }

  async updateSettings(dto: UpdateSiteSettingsDto) {
    return this.prisma.siteSettings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        collectionName: dto.collectionName ?? 'Comic Collection',
      },
      update: {
        ...(dto.collectionName !== undefined && { collectionName: dto.collectionName }),
      },
    })
  }
}
