import { Injectable, ConflictException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { UsersService } from '../users/users.service'
import type { AuthStatusDto, UserDto } from '@comic-shelf/shared-types'
import type { JwtPayload } from './strategies/jwt.strategy'

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string) {
    const user = await this.usersService.findByUsername(username)
    if (!user) return null
    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return null
    const { passwordHash: _, ...result } = user
    return result
  }

  async login(user: { id: number; username: string; role: string }) {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    }
    const token = this.jwtService.sign(payload)
    const userDto: UserDto = {
      id: user.id,
      username: user.username,
      role: user.role as UserDto['role'],
      createdAt: new Date().toISOString(),
    }
    return { token, user: userDto }
  }

  async setup(username: string, password: string) {
    const count = await this.usersService.count()
    if (count > 0) {
      throw new ConflictException('Setup already complete')
    }
    const user = await this.usersService.create(username, password, 'ADMIN')
    return this.login(user)
  }

  async getStatus(cookies: Record<string, string>): Promise<AuthStatusDto> {
    const count = await this.usersService.count()
    const setupComplete = count > 0
    const token = cookies?.['access_token']
    if (!token) return { setupComplete, authenticated: false, user: null }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token)
      const user = await this.usersService.findById(payload.sub)
      if (!user) return { setupComplete, authenticated: false, user: null }
      return {
        setupComplete,
        authenticated: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.role as UserDto['role'],
          createdAt: user.createdAt.toISOString(),
        },
      }
    } catch {
      return { setupComplete, authenticated: false, user: null }
    }
  }
}
