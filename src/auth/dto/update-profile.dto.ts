import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

/** Partial update of account-level profile fields (authenticated user). */

export class OperatorProfileDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  companyName?: string;

  @IsString()
  @MinLength(1)
  @IsOptional()
  businessAddress?: string;

  @IsString()
  @MinLength(1)
  @IsOptional()
  aocNumber?: string;

  @IsString()
  @MinLength(1)
  @IsOptional()
  primaryBaseIcao?: string;
}

export class HbuPartnerProfileDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  companyName?: string;

  @IsString()
  @MinLength(1)
  @IsOptional()
  HBU?: string;
}

export class EngineerCrewProfileDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  specialty?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(80)
  @IsOptional()
  yearsOfExperience?: number;

  @IsString()
  @MinLength(1)
  @IsOptional()
  licenseCertificationId?: string;

  @IsString()
  @MinLength(1)
  @IsOptional()
  languagesSpoken?: string;
}

export class PrivateClientProfileDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  homeAddress?: string;

  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @MinLength(1)
  @IsOptional()
  passportNumber?: string;

  @IsString()
  @MinLength(1)
  @IsOptional()
  preferredAirport?: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  avatarImage?: string;

  // Account-type-specific fields (only update if user has that account type)
  @IsOptional()
  @Type(() => OperatorProfileDto)
  OperatorProfileDto?: OperatorProfileDto;

  @IsOptional()
  @Type(() => PrivateClientProfileDto)
  PrivateClientProfileDto?: PrivateClientProfileDto;

  @IsOptional()
  @Type(() => HbuPartnerProfileDto)
  HbuPartnerProfileDto?: HbuPartnerProfileDto;

  @IsOptional()
  @Type(() => EngineerCrewProfileDto)
  EngineerCrewProfileDto?: EngineerCrewProfileDto;
}
