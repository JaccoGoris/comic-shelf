import { Controller, Get } from '@nestjs/common'
import { PrismaService } from '@comic-shelf/db'
import { AppService } from './app.service'
import { Public } from '../auth/decorators/public.decorator'

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prismaService: PrismaService
  ) {}

  @Public()
  @Get()
  getData() {
    return this.appService.getData()
  }

  @Public()
  @Get('health')
  async health() {
    await this.prismaService.$queryRaw`SELECT 1`
    return { status: 'ok' }
  }
}
