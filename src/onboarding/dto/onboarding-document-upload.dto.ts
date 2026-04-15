import { IsEmail } from 'class-validator';

/** Non-file fields sent with multipart document uploads. */
export class OnboardingDocumentUploadDto {
  @IsEmail()
  email: string;
}
