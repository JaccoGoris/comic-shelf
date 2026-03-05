import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ComicsService } from './comics.service';

@Controller('comics')
export class ComicsController {
  constructor(private readonly comicsService: ComicsService) {}

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
    @Query('sortOrder') sortOrder?: string,
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
      collectionWishlist: collectionWishlist as 'COLLECTION' | 'WISHLIST' | undefined,
      sortBy: sortBy ?? 'dateAdded',
      sortOrder: (sortOrder as 'asc' | 'desc') ?? 'desc',
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.comicsService.findOne(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.comicsService.remove(id);
  }
}
