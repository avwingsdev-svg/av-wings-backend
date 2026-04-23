// 

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

export class UpdateProfileDto {
  // -------------------------
  // BASIC USER FIELDS
  // -------------------------
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

  // -------------------------
  // PRIVATE CLIENT FIELDS
  // -------------------------
  @IsOptional()
  @IsString()
  homeAddress?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  passportNumber?: string;

  @IsOptional()
  @IsString()
  preferredAirport?: string;

  // -------------------------
  // OPERATOR FIELDS
  // -------------------------
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  businessAddress?: string;

  @IsOptional()
  @IsString()
  aocNumber?: string;

  @IsOptional()
  @IsString()
  primaryBaseIcao?: string;

  // -------------------------
  // ENGINEER CREW FIELDS
  // -------------------------
  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(80)
  yearsOfExperience?: number;

  @IsOptional()
  @IsString()
  licenseCertificationId?: string;

  @IsOptional()
  @IsString()
  languagesSpoken?: string;

  // -------------------------
  // HBU PARTNER FIELDS
  // -------------------------
  @IsOptional()
  @IsString()
  hbuCompanyName?: string;

  @IsOptional()
  @IsString()
  HBU?: string;
}