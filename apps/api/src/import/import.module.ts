import { Module } from '@nestjs/common';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';

@Module({
  controllers: [ImportController],
  providers: [ImportService],
})
export class ImportModule {}
