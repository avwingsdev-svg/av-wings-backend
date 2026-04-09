import { IsString, MinLength } from 'class-validator';

export class OperatorProfileDto {
  @IsString()
  @MinLength(1)
  companyName: string;

  @IsString()
  @MinLength(1)
  businessAddress: string;

  @IsString()
  @MinLength(1)
  aocNumber: string;

  @IsString()
  @MinLength(1)
  primaryBaseIcao: string;
}
