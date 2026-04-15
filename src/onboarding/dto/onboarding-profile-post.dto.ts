import { IsEmail } from 'class-validator';
import { EngineerCrewProfileDto } from './engineer-crew-profile.dto';
import { HbuPartnerProfileDto } from './hbu-partner-profile.dto';
import { OperatorProfileDto } from './operator-profile.dto';
import { PilotProfileDto } from './pilot-profile.dto';
import { PrivateClientProfileDto } from './private-client-profile.dto';

/** POST body: profile fields plus email (must match the authenticated user). */
export class PrivateClientProfilePostDto extends PrivateClientProfileDto {
  @IsEmail()
  email: string;
}

export class OperatorProfilePostDto extends OperatorProfileDto {
  @IsEmail()
  email: string;
}

export class PilotProfilePostDto extends PilotProfileDto {
  @IsEmail()
  email: string;
}

export class EngineerCrewProfilePostDto extends EngineerCrewProfileDto {
  @IsEmail()
  email: string;
}

export class HbuPartnerProfilePostDto extends HbuPartnerProfileDto {
  @IsEmail()
  email: string;
}
