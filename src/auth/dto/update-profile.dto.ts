import { IsOptional, IsString, MinLength } from 'class-validator';

/** Partial update of account-level profile fields (authenticated user). */
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
}
