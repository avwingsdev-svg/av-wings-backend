import { IsEmail, IsString, Length, Matches } from 'class-validator';

export class SignupVerifyDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(4, 4)
  @Matches(/^\d{4}$/)
  otp: string;
}
