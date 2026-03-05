import { Module } from '@nestjs/common';
import { PrismaModule } from '@comic-shelf/db';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ComicsModule } from '../comics/comics.module';
import { ImportModule } from '../import/import.module';
import { ResourcesModule } from '../resources/resources.module';
import { MetronModule } from '../metron/metron.module';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [
    PrismaModule,
    SharedModule,
    ComicsModule,
    ImportModule,
    ResourcesModule,
    MetronModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
