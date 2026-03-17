import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  Query,
  UseGuards,
  HttpCode,
  BadRequestException,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import type { Request, Response } from 'express'
import { AuthService } from './auth.service'
import { OidcService } from './oidc.service'
import { UsersService } from '../users/users.service'
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
  constructor(
    private readonly authService: AuthService,
    private readonly oidcService: OidcService,
    private readonly usersService: UsersService
  ) {}

  @Public()
  @Get('status')
  getStatus(@Req() req: Request) {
    return this.authService.getStatus(req.cookies as Record<string, string>)
  }

  @Public()
  @Post('setup')
  async setup(
    @Body() dto: SetupDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const { token, user } = await this.authService.setup(
      dto.username,
      dto.password
    )
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

  @Public()
  @Get('oidc')
  async oidcRedirect(@Res() res: Response) {
    if (!this.oidcService.isEnabled()) {
      throw new BadRequestException('OIDC is not enabled')
    }
    const { url, state, codeVerifier } =
      await this.oidcService.getAuthorizationUrl()
    const statePayload = JSON.stringify({ state, codeVerifier })
    res.cookie('oidc_state', statePayload, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 5 * 60 * 1000, // 5 minutes
    })
    res.redirect(302, url)
  }

  @Public()
  @Get('oidc/callback')
  async oidcCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    if (!this.oidcService.isEnabled()) {
      throw new BadRequestException('OIDC is not enabled')
    }

    const rawCookie = (req.cookies as Record<string, string>)['oidc_state']
    res.clearCookie('oidc_state', { path: '/' })

    if (!rawCookie) {
      return res.redirect('/login?error=oidc_no_user')
    }

    let cookieState: string
    let codeVerifier: string
    try {
      const parsed = JSON.parse(rawCookie) as {
        state: string
        codeVerifier: string
      }
      cookieState = parsed.state
      codeVerifier = parsed.codeVerifier
    } catch {
      return res.redirect('/login?error=oidc_no_user')
    }

    if (!code || !state || state !== cookieState) {
      return res.redirect('/login?error=oidc_no_user')
    }

    try {
      const { preferredUsername } = await this.oidcService.handleCallback(
        code,
        state,
        codeVerifier
      )
      const user = await this.usersService.findByUsername(preferredUsername)
      if (!user) {
        return res.redirect('/login?error=oidc_no_user')
      }

      const { token } = await this.authService.login(user)
      setCookieToken(req, res, token)
      return res.redirect('/')
    } catch {
      return res.redirect('/login?error=oidc_no_user')
    }
  }
}
