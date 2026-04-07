import { IsEmail } from 'class-validator';

export class EmailBodyDto {
  @IsEmail()
  email: string;
}
