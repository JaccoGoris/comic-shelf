/// <reference types="multer" />
import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ImportService } from './import.service'

@Controller('import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async importComics(@UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) {
      throw new BadRequestException('No file uploaded. Use form field "file".')
    }

    if (!file.originalname.endsWith('.json')) {
      throw new BadRequestException('Only JSON files are accepted.')
    }

    let data: unknown[]
    try {
      data = JSON.parse(file.buffer.toString('utf-8'))
    } catch {
      throw new BadRequestException('Invalid JSON file.')
    }

    if (!Array.isArray(data)) {
      throw new BadRequestException('JSON file must contain an array.')
    }

    return this.importService.importComics(data)
  }
}
