import { Controller, Get, Query } from '@nestjs/common'
import { PrismaService } from '@comic-shelf/db'

@Controller('genres')
export class GenresController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(@Query('search') search?: string) {
    return this.prisma.genre.findMany({
      where: search
        ? { name: { contains: search, mode: 'insensitive' } }
        : undefined,
      orderBy: { name: 'asc' },
    })
  }
}
