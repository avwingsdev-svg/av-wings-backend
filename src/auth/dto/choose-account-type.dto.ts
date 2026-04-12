import { IsEmail, IsEnum } from 'class-validator';
import { UserAccountType } from '../../schema/User.schema';

export class ChooseAccountTypeDto {
  @IsEmail()
  email: string;

  @IsEnum(UserAccountType)
  accountType: UserAccountType;
}
