import { Module } from '@nestjs/common'
import { MetronClient } from '@comic-shelf/metron-client'
import { MetronController } from './metron.controller'
import { MetronService } from './metron.service'

@Module({
  controllers: [MetronController],
  providers: [
    {
      provide: MetronClient,
      useFactory: () =>
        new MetronClient({
          baseUrl: process.env['METRON_API_BASE_URL'] || 'https://metron.cloud',
          username: process.env['METRON_USERNAME'] || '',
          password: process.env['METRON_PASSWORD'] || '',
          timeout: 15000,
          minRequestIntervalMs: 3100,
        }),
    },
    MetronService,
  ],
})
export class MetronModule {}
