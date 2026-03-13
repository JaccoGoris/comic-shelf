import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  HttpCode,
} from '@nestjs/common'
import { TrackedSeriesService } from './tracked-series.service'
import type { CreateTrackedSeriesDto } from '@comic-shelf/shared-types'

@Controller('tracked-series')
export class TrackedSeriesController {
  constructor(private readonly trackedSeriesService: TrackedSeriesService) {}

  @Get()
  listAll() {
    return this.trackedSeriesService.listAll()
  }

  @Post()
  create(@Body() dto: CreateTrackedSeriesDto) {
    return this.trackedSeriesService.create(dto)
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.trackedSeriesService.remove(id)
  }

  @Get(':metronSeriesId/issues')
  getIssues(@Param('metronSeriesId', ParseIntPipe) metronSeriesId: number) {
    return this.trackedSeriesService.getIssues(metronSeriesId)
  }
}
