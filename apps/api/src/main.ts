/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import 'dotenv/config'

// Build DATABASE_URL from individual parts if not already set
if (!process.env.DATABASE_URL) {
  const host = process.env.POSTGRES_HOST || 'postgres'
  const port = process.env.POSTGRES_PORT || '5432'
  const user = process.env.POSTGRES_USER || 'comic_shelf'
  const password = process.env.POSTGRES_PASSWORD || 'comic_shelf'
  const db = process.env.POSTGRES_DB || 'comic_shelf'
  process.env.DATABASE_URL = `postgresql://${user}:${password}@${host}:${port}/${db}?schema=public`
}

import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import cookieParser from 'cookie-parser'
import { AppModule } from './app/app.module'

declare const module: any

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const globalPrefix = 'api'
  app.setGlobalPrefix(globalPrefix)
  app.getHttpAdapter().getInstance().set('trust proxy', true)
  app.use(cookieParser())
  app.enableCors({
    origin: (process.env.CORS_ORIGINS || 'http://localhost:4200').split(','),
    credentials: true,
  })
  const port = process.env.PORT || 3000
  await app.listen(port)
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  )

  if (module.hot) {
    module.hot.accept()
    module.hot.dispose(() => app.close())
  }
}

bootstrap()
