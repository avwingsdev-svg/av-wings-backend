import { IsNumber, IsString, Max, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class EngineerCrewProfileDto {
  @IsString()
  @MinLength(1)
  specialty: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(80)
  yearsOfExperience: number;

  @IsString()
  @MinLength(1)
  licenseCertificationId: string;

  @IsString()
  @MinLength(1)
  languagesSpoken: string;
}
