import { IsString, MinLength } from 'class-validator';

export class HbuPartnerProfileDto {
  @IsString()
  @MinLength(1)
  companyName: string;

  @IsString()
  @MinLength(1)
  HBU: string;
}
