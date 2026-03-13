import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  ParseIntPipe,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ComicsService } from './comics.service'
import type { CreateComicDto, UpdateComicDto } from '@comic-shelf/shared-types'

@Controller('comics')
export class ComicsController {
  constructor(private readonly comicsService: ComicsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateComicDto) {
    return this.comicsService.create(dto)
  }

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('publisherId') publisherId?: string,
    @Query('seriesId') seriesId?: string,
    @Query('creatorId') creatorId?: string,
    @Query('characterId') characterId?: string,
    @Query('genreId') genreId?: string,
    @Query('read') read?: string,
    @Query('collectionWishlist') collectionWishlist?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string
  ) {
    return this.comicsService.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? Math.min(parseInt(limit, 10), 5000) : 20,
      search,
      publisherId: publisherId ? parseInt(publisherId, 10) : undefined,
      seriesId: seriesId ? parseInt(seriesId, 10) : undefined,
      creatorId: creatorId ? parseInt(creatorId, 10) : undefined,
      characterId: characterId ? parseInt(characterId, 10) : undefined,
      genreId: genreId ? parseInt(genreId, 10) : undefined,
      read: read === 'true' ? true : read === 'false' ? false : undefined,
      collectionWishlist: collectionWishlist as
        | 'COLLECTION'
        | 'WISHLIST'
        | 'MISSING'
        | undefined,
      sortBy: sortBy ?? 'volume',
      sortOrder: (sortOrder as 'asc' | 'desc') ?? 'asc',
    })
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.comicsService.findOne(id)
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateComicDto) {
    return this.comicsService.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.comicsService.remove(id)
  }
}
