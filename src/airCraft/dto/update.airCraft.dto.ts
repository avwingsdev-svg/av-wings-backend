import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateAircraftDto {
  @IsString()
  @IsOptional()
  model?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  tailNumber?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  seats?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  rangeNm?: number;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  baseAirport?: string;
  
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  hourlyRate?: number;

  @IsOptional()
  @IsString()
  @IsOptional()
  photo?: string;
}
