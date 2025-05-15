import { UserResponseDto } from '@/modules/users/dto/user-response.dto';
import { Exclude, Expose, Type } from 'class-transformer';

@Exclude()
export class AuthResponseDto {
  @Expose()
  @Type(() => UserResponseDto)
  user: UserResponseDto;

  @Expose()
  accessToken: string;

  constructor(partial: Partial<AuthResponseDto>) {
    Object.assign(this, partial);
  }
}
