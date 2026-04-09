import { Type } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { HbuServiceType } from '../../schema/hbu-service.schema';

const DEFAULT_LIMIT = 20;

export class ListServicesQueryDto {
  @IsOptional()
  @IsEnum(HbuServiceType)
  serviceType?: HbuServiceType;

  /** Case-insensitive partial match on home base label. */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  homeBaseLabel?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  skip?: number;
}

export { DEFAULT_LIMIT };
