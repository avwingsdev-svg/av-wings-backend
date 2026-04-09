import { IsDateString, IsString, MinLength } from 'class-validator';

export class PrivateClientProfileDto {
  @IsString()
  @MinLength(1)
  homeAddress: string;

  @IsDateString()
  dateOfBirth: string;

  @IsString()
  @MinLength(1)
  passportNumber: string;

  @IsString()
  @MinLength(1)
  preferredAirport: string;
}
