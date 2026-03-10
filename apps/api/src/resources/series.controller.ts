import { Controller, Get, Query } from '@nestjs/common'
import { PrismaService } from '@comic-shelf/db'

@Controller('series')
export class SeriesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(
    @Query('search') search?: string,
    @Query('publisherId') publisherId?: string
  ) {
    return this.prisma.series.findMany({
      where: {
        ...(search
          ? { name: { contains: search, mode: 'insensitive' as const } }
          : {}),
        ...(publisherId ? { publisherId: parseInt(publisherId, 10) } : {}),
      },
      include: { publisher: true },
      orderBy: { name: 'asc' },
    })
  }
}
