import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsString, Min, MinLength } from 'class-validator';

export class CreateHelicopterBookingDto {
  @IsString()
  @MinLength(1)
  fromLocation: string;

  @IsString()
  @MinLength(1)
  toLocation: string;

  @IsDateString()
  travelDateTime: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  pax: number;
}
