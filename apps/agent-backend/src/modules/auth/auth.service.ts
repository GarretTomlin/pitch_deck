import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { UsersService } from '../users/users.service';

interface OAuthProfile {
  email: string;
  name: string;
  picture?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<Omit<User, 'password'> | null> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: Omit<User, 'password'>): Promise<AuthResponseDto> {
    const payload = { email: user.email, sub: user.id };
    const accessToken = this.jwtService.sign(payload);
    
    return new AuthResponseDto({
      user: new UserResponseDto(user),
      accessToken,
    });
  }

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const newUser = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });

    const { password, ...result } = newUser;
    return this.login(result);
  }

  async validateOAuthUser(profile: OAuthProfile): Promise<Omit<User, 'password'>> {
    let user = await this.usersService.findByEmail(profile.email);

    if (!user) {
      const newUser = {
        email: profile.email,
        name: profile.name,
        password: await bcrypt.hash(Math.random().toString(36), 10),
      };

      user = await this.usersService.create(newUser);
    }

    const { password, ...result } = user;
    return result;
  }
}