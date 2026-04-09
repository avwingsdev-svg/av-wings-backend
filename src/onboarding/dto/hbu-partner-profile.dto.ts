import { IsString, MinLength } from 'class-validator';

export class HbuPartnerProfileDto {
  @IsString()
  @MinLength(1)
  businessName: string;

  @IsString()
  @MinLength(1)
  airportIcaoOrIata: string;

  @IsString()
  @MinLength(1)
  servicesDescription: string;
}
