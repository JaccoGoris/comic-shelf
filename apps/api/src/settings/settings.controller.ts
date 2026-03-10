import { Controller, Get, Patch, Body } from '@nestjs/common'
import { SettingsService } from './settings.service'
import type { UpdateSiteSettingsDto } from '@comic-shelf/shared-types'

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getSettings() {
    return this.settingsService.getSettings()
  }

  @Patch()
  updateSettings(@Body() dto: UpdateSiteSettingsDto) {
    return this.settingsService.updateSettings(dto)
  }
}
