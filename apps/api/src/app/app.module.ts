import { Module } from '@nestjs/common'
import { ServeStaticModule } from '@nestjs/serve-static'
import { join } from 'path'
import { PrismaModule } from '@comic-shelf/db'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { ComicsModule } from '../comics/comics.module'
import { ImportModule } from '../import/import.module'
import { ResourcesModule } from '../resources/resources.module'
import { MetronModule } from '../metron/metron.module'
import { SharedModule } from '../shared/shared.module'
import { AuthModule } from '../auth/auth.module'
import { UsersModule } from '../users/users.module'

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath:
        process.env.FRONTEND_DIST_PATH ||
        join(__dirname, '..', 'public'),
      exclude: ['/api/{*path}'],
    }),
    PrismaModule,
    SharedModule,
    AuthModule,
    UsersModule,
    ComicsModule,
    ImportModule,
    ResourcesModule,
    MetronModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
