import { IsArray, IsNumber, IsString, Max, Min, MinLength } from 'class-validator';
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

  @IsArray()
  @IsString({ each: true }) 
  @MinLength(1, { each: true })
  languagesSpoken: string[];
}
