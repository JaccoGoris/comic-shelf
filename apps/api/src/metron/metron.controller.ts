import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  BadRequestException,
  ParseIntPipe,
  HttpCode,
} from '@nestjs/common'
import { MetronService } from './metron.service'

@Controller('metron')
export class MetronController {
  constructor(private readonly metronService: MetronService) {}

  @Get('search')
  async search(
    @Query('upc') upc?: string,
    @Query('series_name') seriesName?: string,
    @Query('number') issueNumber?: string,
    @Query('publisher_name') publisherName?: string
  ) {
    const hasUpc = upc && upc.trim()
    const hasSeriesSearch = seriesName?.trim() && issueNumber?.trim()

    if (!hasUpc && !hasSeriesSearch) {
      throw new BadRequestException(
        'Provide either a UPC or both series_name and number query parameters.'
      )
    }

    // Try UPC first if provided
    if (hasUpc) {
      const results = await this.metronService.searchByUpc(upc.trim())
      if (results.length > 0) return results
      // Fall through to series search if UPC returned nothing and series params are available
      if (!hasSeriesSearch) return results
    }

    return this.metronService.searchBySeriesAndIssue(
      seriesName!.trim(),
      issueNumber!.trim(),
      publisherName?.trim()
    )
  }

  @Get('issue/:id')
  async getIssueDetail(@Param('id', ParseIntPipe) id: number) {
    return this.metronService.getIssueDetail(id)
  }

  @Post('import/:id')
  async importIssue(@Param('id', ParseIntPipe) id: number) {
    return this.metronService.importIssue(id)
  }

  @Post('sync/:comicId')
  async syncSingleIssue(@Param('comicId', ParseIntPipe) comicId: number) {
    return this.metronService.syncSingleIssue(comicId)
  }

  @Post('sync')
  @HttpCode(202)
  async startSync() {
    return this.metronService.startSync()
  }

  @Get('sync/status')
  getSyncStatus() {
    return this.metronService.getSyncStatus()
  }

  @Delete('sync')
  @HttpCode(200)
  stopSync() {
    return this.metronService.stopSync()
  }
}
