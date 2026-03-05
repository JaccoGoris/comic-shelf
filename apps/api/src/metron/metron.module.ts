import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MetronController } from './metron.controller';
import { MetronService } from './metron.service';

@Module({
  imports: [
    HttpModule.register({
      baseURL: process.env['METRON_API_BASE_URL'] || 'https://metron.cloud',
      auth: {
        username: process.env['METRON_USERNAME'] || '',
        password: process.env['METRON_PASSWORD'] || '',
      },
      timeout: 15000,
    }),
  ],
  controllers: [MetronController],
  providers: [MetronService],
})
export class MetronModule {}
