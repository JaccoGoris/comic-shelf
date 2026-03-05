import { Module } from '@nestjs/common';
import { PublishersController } from './publishers.controller';
import { SeriesController } from './series.controller';
import { CreatorsController } from './creators.controller';
import { CharactersController } from './characters.controller';
import { GenresController } from './genres.controller';
import { StoryArcsController } from './story-arcs.controller';

@Module({
  controllers: [
    PublishersController,
    SeriesController,
    CreatorsController,
    CharactersController,
    GenresController,
    StoryArcsController,
  ],
})
export class ResourcesModule {}
