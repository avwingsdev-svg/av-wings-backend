import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { UserAccountType } from '../../schema/User.schema';

/** Body for POST /auth/google — no password; verification comes from the IdP. */
export class GoogleAuthDto {
  @IsString()
  @MinLength(1)
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  phoneNumber: string;

  @IsString()
  @MinLength(1)
  googleId: string;

  @IsString()
  @IsOptional()
  avatarImage?: string;

  @IsOptional()
  @IsEnum(UserAccountType)
  accountType?: UserAccountType;
}
