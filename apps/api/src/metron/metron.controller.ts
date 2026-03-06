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
} from '@nestjs/common';
import { MetronService } from './metron.service';

@Controller('metron')
export class MetronController {
  constructor(private readonly metronService: MetronService) {}

  @Get('search')
  async searchByUpc(@Query('upc') upc: string) {
    if (!upc || !upc.trim()) {
      throw new BadRequestException('UPC query parameter is required.');
    }
    return this.metronService.searchByUpc(upc.trim());
  }

  @Get('issue/:id')
  async getIssueDetail(@Param('id', ParseIntPipe) id: number) {
    return this.metronService.getIssueDetail(id);
  }

  @Post('import/:id')
  async importIssue(@Param('id', ParseIntPipe) id: number) {
    return this.metronService.importIssue(id);
  }

  @Post('sync')
  @HttpCode(202)
  async startSync() {
    return this.metronService.startSync();
  }

  @Get('sync/status')
  getSyncStatus() {
    return this.metronService.getSyncStatus();
  }

  @Delete('sync')
  @HttpCode(200)
  stopSync() {
    return this.metronService.stopSync();
  }
}
