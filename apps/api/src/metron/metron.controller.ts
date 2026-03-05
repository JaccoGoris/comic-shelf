import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  BadRequestException,
  ParseIntPipe,
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
}
