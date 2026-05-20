import { Type } from "class-transformer";
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class CreateAircraftDto {
  @IsString()
  @IsNotEmpty()
  model: string;

  @IsString()
  @IsNotEmpty()
  tailNumber: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  seats: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  rangeNm: number;

  @IsString()
  @IsNotEmpty()
  baseAirport: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  hourlyRate: number;

  @IsOptional()
  @IsString()
  photo?: string;
}