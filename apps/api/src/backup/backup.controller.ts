/// <reference types="multer" />
import {
  Controller,
  Get,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import type { Response } from 'express'
import { BackupService } from './backup.service'
import type { BackupEnvelope } from '@comic-shelf/shared-types'
import { migrateToCurrentVersion } from './backup-migrations'

@Controller('backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get('export')
  async exportBackup(@Res() res: Response) {
    const data = await this.backupService.exportAll()
    const json = JSON.stringify(data, null, 2)
    const date = new Date().toISOString().slice(0, 10)
    res.setHeader('Content-Type', 'application/json')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="comic-shelf-backup-${date}.json"`,
    )
    res.send(json)
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importBackup(@UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) {
      throw new BadRequestException('No file uploaded. Use form field "file".')
    }

    if (!file.originalname.endsWith('.json')) {
      throw new BadRequestException('Only JSON files are accepted.')
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(file.buffer.toString('utf-8'))
    } catch {
      throw new BadRequestException('Invalid JSON file.')
    }

    let version: number
    let rawComics: Record<string, unknown>[]

    if (Array.isArray(parsed)) {
      // v1: bare array
      version = 1
      rawComics = parsed as Record<string, unknown>[]
    } else if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'version' in parsed &&
      'comics' in parsed
    ) {
      const envelope = parsed as BackupEnvelope
      if (!Array.isArray(envelope.comics)) {
        throw new BadRequestException('Invalid backup envelope: comics must be an array.')
      }
      version = envelope.version
      rawComics = envelope.comics as unknown as Record<string, unknown>[]
    } else {
      throw new BadRequestException('Unrecognised backup format.')
    }

    const comics = migrateToCurrentVersion(rawComics, version)
    return this.backupService.importBackup(comics)
  }
}
