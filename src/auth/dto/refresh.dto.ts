import { IsEmail, IsString, MinLength } from 'class-validator';

export class RefreshDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(10)
  refreshToken: string;
}
