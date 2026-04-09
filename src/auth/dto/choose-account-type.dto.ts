import { IsEnum } from 'class-validator';
import { UserAccountType } from '../../schema/User.schema';

export class ChooseAccountTypeDto {
  @IsEnum(UserAccountType)
  accountType: UserAccountType;
}
