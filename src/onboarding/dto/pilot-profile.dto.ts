import { IsNumber, IsString, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class PilotProfileDto {
  @IsString()
  @MinLength(1)
  licenseNumber: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalFlightHours: number;

  @IsString()
  @MinLength(1)
  medicalClass: string;

  @IsString()
  @MinLength(1)
  typeRatings: string;
}
