import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '@comic-shelf/db'
import type { UserRole } from '@comic-shelf/shared-types'

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: { id: true, username: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } })
  }

  async findById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, role: true, createdAt: true },
    })
  }

  async create(username: string, password: string, role: UserRole = 'USER') {
    const existing = await this.prisma.user.findUnique({ where: { username } })
    if (existing) throw new ConflictException('Username already exists')
    const passwordHash = await bcrypt.hash(password, 10)
    return this.prisma.user.create({
      data: { username, passwordHash, role },
      select: { id: true, username: true, role: true, createdAt: true },
    })
  }

  async remove(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } })
    if (!user) throw new NotFoundException('User not found')

    const adminCount = await this.prisma.user.count({
      where: { role: 'ADMIN' },
    })
    if (user.role === 'ADMIN' && adminCount <= 1) {
      throw new BadRequestException('Cannot delete the last admin user')
    }

    await this.prisma.user.delete({ where: { id } })
  }

  async count() {
    return this.prisma.user.count()
  }
}
