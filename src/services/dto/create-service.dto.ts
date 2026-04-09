import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { HbuServiceType } from '../../schema/hbu-service.schema';

export class CreateServiceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  homeBaseLabel: string;

  @IsEnum(HbuServiceType)
  serviceType: HbuServiceType;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  terminalLocation: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  tagline?: string;

  /** Comma-separated labels, e.g. `Spa,Fine Dining,Private Suites`. */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  features?: string;
}
