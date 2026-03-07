import { Controller, Get, Query } from '@nestjs/common'
import { PrismaService } from '@comic-shelf/db'

@Controller('story-arcs')
export class StoryArcsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findAll(@Query('search') search?: string) {
    return this.prisma.storyArc.findMany({
      where: search
        ? { name: { contains: search, mode: 'insensitive' } }
        : undefined,
      orderBy: { name: 'asc' },
    })
  }
}
