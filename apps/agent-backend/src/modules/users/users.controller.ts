import {
  Controller,
  Get,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UserResponseDto } from './dto/user-response.dto';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.usersService.findAll();
    return users.map(user => new UserResponseDto(user));
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    return new UserResponseDto(user);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateData: Partial<User>,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.update(id, updateData);
    return new UserResponseDto(user);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    await this.usersService.delete(id);
  }
}