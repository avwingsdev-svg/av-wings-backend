import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  HbuServiceStatus,
  HbuServiceType,
} from '../../schema/hbu-service.schema';

export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  homeBaseLabel?: string;

  @IsOptional()
  @IsEnum(HbuServiceType)
  serviceType?: HbuServiceType;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  terminalLocation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  tagline?: string;

  /** Comma-separated labels; replaces previous feature list when sent. */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  features?: string;

  @IsOptional()
  @IsEnum(HbuServiceStatus)
  status?: HbuServiceStatus;
}
