import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { UserAccountType } from '../../schema/User.schema';

export class SignupDto {
  @IsString()
  @MinLength(1)
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  phoneNumber: string;

  @IsString()
  @IsOptional()
  authProvider: string;

  @IsString()
  @IsOptional()
  googleId?: string;

  @IsString()
  @IsOptional()
  avatarImage?: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsEnum(UserAccountType)
  accountType?: UserAccountType;
}
