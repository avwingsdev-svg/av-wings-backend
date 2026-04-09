import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsInt, IsString, Min, MinLength } from 'class-validator';

export class CreateJetBookingDto {
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

  @Type(() => Boolean)
  @IsBoolean()
  showEmptyLegOnly: boolean;
}
