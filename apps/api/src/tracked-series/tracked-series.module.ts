import { Module } from '@nestjs/common'
import { TrackedSeriesController } from './tracked-series.controller'
import { TrackedSeriesService } from './tracked-series.service'
import { MetronModule } from '../metron/metron.module'

@Module({
  imports: [MetronModule],
  controllers: [TrackedSeriesController],
  providers: [TrackedSeriesService],
})
export class TrackedSeriesModule {}
