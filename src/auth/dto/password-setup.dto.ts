import { IsEmail, IsString, Length, Matches, MinLength } from 'class-validator';

export class PasswordSetupDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(4, 4)
  @Matches(/^\d{4}$/)
  otp: string;

  @IsString()
  @MinLength(8)
  password: string;
}
