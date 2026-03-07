import { Controller, Get, Query } from '@nestjs/common'
import { PrismaService } from '@comic-shelf/db'

@Controller('publishers')
export class PublishersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(@Query('search') search?: string) {
    return this.prisma.publisher.findMany({
      where: search
        ? { name: { contains: search, mode: 'insensitive' } }
        : undefined,
      orderBy: { name: 'asc' },
    })
  }
}
