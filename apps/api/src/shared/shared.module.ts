import { Module, Global } from '@nestjs/common';
import { UpsertService } from './upsert.service';

@Global()
@Module({
  providers: [UpsertService],
  exports: [UpsertService],
})
export class SharedModule {}
