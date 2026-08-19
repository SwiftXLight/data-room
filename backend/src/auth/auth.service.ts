import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException({
        code: 'AUTH_EMAIL_ALREADY_EXISTS',
        message: 'An account with this email already exists.',
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
      },
      select: { id: true, email: true },
    });

    const accessToken = this.jwtService.sign({ sub: user.id, email: user.email });

    return { user, accessToken };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      });
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordValid) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      });
    }

    const accessToken = this.jwtService.sign({ sub: user.id, email: user.email });

    return {
      user: { id: user.id, email: user.email },
      accessToken,
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: 'AUTH_TOKEN_INVALID',
        message: 'User not found.',
      });
    }

    return user;
  }
}
