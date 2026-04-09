import { Equals } from 'class-validator';

export class AcceptTermsDto {
  @Equals(true, { message: 'You must accept the terms to continue.' })
  accepted: boolean;
}
