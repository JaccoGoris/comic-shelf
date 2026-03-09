import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import type { Request, Response } from 'express'
import { AuthService } from './auth.service'
import { Public } from './decorators/public.decorator'
import type { SetupDto } from '@comic-shelf/shared-types'

function cookieMaxAge(expiration: string): number {
  const unit = expiration.slice(-1)
  const value = parseInt(expiration.slice(0, -1), 10)
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  }
  return (multipliers[unit] ?? 7 * 24 * 60 * 60 * 1000) * value
}

function setCookieToken(req: Request, res: Response, token: string) {
  const expiration = process.env.JWT_EXPIRATION || '7d'
  res.cookie('access_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.secure,
    path: '/',
    maxAge: cookieMaxAge(expiration),
  })
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('status')
  getStatus(@Req() req: Request) {
    return this.authService.getStatus(req.cookies as Record<string, string>)
  }

  @Public()
  @Post('setup')
  async setup(@Body() dto: SetupDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { token, user } = await this.authService.setup(dto.username, dto.password)
    setCookieToken(req, res, token)
    return { user }
  }

  @Public()
  @UseGuards(AuthGuard('local'))
  @Post('login')
  @HttpCode(200)
  async login(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { token, user } = await this.authService.login(req.user as any)
    setCookieToken(req, res, token)
    return { user }
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', { path: '/' })
    return { message: 'Logged out' }
  }
}
