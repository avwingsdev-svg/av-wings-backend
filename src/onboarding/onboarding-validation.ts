import { User, UserAccountType, VerificationStatus } from '../schema/User.schema';

/**
 * Pure functions that encode onboarding business rules: which fields belong to each account type,
 * how “complete” is derived, and which screen the app should show next.
 */

export type OnboardingNextStep =
  | 'account_type'
  | 'terms'
  | 'avatar'
  | 'profile'
  | 'documents'
  | 'submit'
  | 'pending_review'
  | 'complete';

export type OnboardingStatusPayload = {
  accountType: UserAccountType | null;
  termsAccepted: boolean;
  verificationStatus: string;
  /** Profile photo uploaded (Figma: image step after terms). */
  avatarComplete: boolean;
  /** Account-type text fields only (no avatar). */
  profileDetailsComplete: boolean;
  /** Avatar + profile details (full “Create profile” step). */
  profileComplete: boolean;
  documentsComplete: boolean;
  documentsSkipped: boolean;
  missingProfileFields: string[];
  missingDocumentKeys: string[];
  canSubmit: boolean;
  /** Suggested screen for your mobile app after “Continue”. */
  nextStep: OnboardingNextStep;
};

/** Returns API field names still empty for the user’s current account type profile subdocument. */
export function getMissingProfileFields(user: User): string[] {
  if (!user.accountType) {
    return ['accountType'];
  }

  switch (user.accountType) {
    case UserAccountType.PRIVATE_CLIENT_BROKER: {
      const p = user.privateClientProfile;
      const m: string[] = [];
      if (!p?.homeAddress?.trim()) m.push('homeAddress');
      if (!p?.dateOfBirth) m.push('dateOfBirth');
      if (!p?.passportNumber?.trim()) m.push('passportNumber');
      if (!p?.preferredAirport?.trim()) m.push('preferredAirport');
      return m;
    }
    case UserAccountType.OPERATOR: {
      const p = user.operatorProfile;
      const m: string[] = [];
      if (!p?.companyName?.trim()) m.push('companyName');
      if (!p?.businessAddress?.trim()) m.push('businessAddress');
      if (!p?.aocNumber?.trim()) m.push('aocNumber');
      if (!p?.primaryBaseIcao?.trim()) m.push('primaryBaseIcao');
      return m;
    }
    case UserAccountType.PILOT: {
      const p = user.pilotProfile;
      const m: string[] = [];
      if (!p?.licenseNumber?.trim()) m.push('licenseNumber');
      if (p?.totalFlightHours === undefined || p?.totalFlightHours === null) {
        m.push('totalFlightHours');
      }
      if (!p?.medicalClass?.trim()) m.push('medicalClass');
      if (!p?.typeRatings?.trim()) m.push('typeRatings');
      return m;
    }
    case UserAccountType.ENGINEER_CREW: {
      const p = user.engineerCrewProfile;
      const m: string[] = [];
      if (!p?.specialty?.trim()) m.push('specialty');
      if (
        p?.yearsOfExperience === undefined ||
        p?.yearsOfExperience === null
      ) {
        m.push('yearsOfExperience');
      }
      if (!p?.licenseCertificationId?.trim()) {
        m.push('licenseCertificationId');
      }
      if (!p?.languagesSpoken?.trim()) m.push('languagesSpoken');
      return m;
    }
    case UserAccountType.HBU_PARTNER: {
      const p = user.hbuPartnerProfile;
      const m: string[] = [];
      if (!p?.companyName?.trim()) m.push('companyName');
      if (!p?.HBU?.trim()) m.push('HBU');
      return m;
    }
    default:
      return [];
  }
}

/** Returns logical document keys (form field names) still missing for KYC per account type. */
export function getMissingDocumentKeys(user: User): string[] {
  if (!user.accountType) {
    return ['accountType'];
  }

  switch (user.accountType) {
    case UserAccountType.PRIVATE_CLIENT_BROKER: {
      const d = user.privateClientDocuments;
      const m: string[] = [];
      if (!d?.passportKey) m.push('passport');
      if (!d?.governmentIdKey) m.push('governmentId');
      return m;
    }
    case UserAccountType.OPERATOR: {
      const d = user.operatorDocuments;
      const m: string[] = [];
      if (!d?.aocCertificateKey) m.push('aocCertificate');
      if (!d?.insurancePolicyKey) m.push('insurancePolicy');
      if (!d?.businessLicenseKey) m.push('businessLicense');
      return m;
    }
    case UserAccountType.PILOT: {
      const d = user.pilotDocuments;
      const m: string[] = [];
      if (!d?.pilotLicenseKey) m.push('pilotLicense');
      if (!d?.medicalCertificateKey) m.push('medicalCertificate');
      return m;
    }
    case UserAccountType.ENGINEER_CREW: {
      const d = user.engineerCrewDocuments;
      const m: string[] = [];
      if (!d?.professionalLicenseKey) m.push('professionalLicense');
      if (!d?.backgroundCheckKey) m.push('backgroundCheck');
      return m;
    }
    case UserAccountType.HBU_PARTNER: {
      const d = user.hbuPartnerDocuments;
      const m: string[] = [];
      if (!d?.businessLicenseKey) m.push('businessLicense');
      if (!d?.insurancePolicyKey) {
        m.push('insurancePolicy');
      }
      return m;
    }
    default:
      return [];
  }
}

/** Whether required profile text fields for the current account type are filled. */
export function computeProfileDetailsComplete(user: User): boolean {
  const missingProfileFields = getMissingProfileFields(user);
  return Boolean(user.accountType) && missingProfileFields.length === 0;
}

/** Whether required documents are uploaded or the user skipped the document step. */
export function computeDocumentsComplete(user: User): boolean {
  const missingDocumentKeys = getMissingDocumentKeys(user);
  const documentsSkipped = Boolean(user.onboardingDocumentsSkippedAt);
  return missingDocumentKeys.length === 0 || documentsSkipped;
}

/**
 * Ordered funnel: account type → terms → avatar → profile text → documents → submit vs done,
 * with special cases once verification leaves the pending state.
 */
function computeNextStep(
  user: User,
  args: {
    termsAccepted: boolean;
    avatarComplete: boolean;
    profileDetailsComplete: boolean;
    documentsComplete: boolean;
    canSubmit: boolean;
  },
): OnboardingNextStep {
  if (!user.accountType) {
    return 'account_type';
  }
  if (!args.termsAccepted) {
    return 'terms';
  }
  if (!args.avatarComplete) {
    return 'avatar';
  }
  if (!args.profileDetailsComplete) {
    return 'profile';
  }
  if (!args.documentsComplete) {
    return 'documents';
  }

  const v = user.verificationStatus ?? VerificationStatus.PENDING;
  if (v === VerificationStatus.SUBMITTED) {
    return 'pending_review';
  }
  if (
    v === VerificationStatus.APPROVED ||
    v === VerificationStatus.REJECTED
  ) {
    return 'complete';
  }
  if (args.canSubmit) {
    return 'submit';
  }
  return 'complete';
}

/** Aggregates booleans, missing-field lists, and `nextStep` for the mobile onboarding navigator. */
export function buildOnboardingStatus(user: User): OnboardingStatusPayload {
  const termsAccepted = Boolean(user.termsAcceptedAt);
  const avatarComplete = Boolean(user.profileAvatarKey);
  const missingProfileFields = getMissingProfileFields(user);
  const missingDocumentKeys = getMissingDocumentKeys(user);
  const profileDetailsComplete = computeProfileDetailsComplete(user);
  const profileComplete = avatarComplete && profileDetailsComplete;
  const documentsSkipped = Boolean(user.onboardingDocumentsSkippedAt);
  const documentsComplete = computeDocumentsComplete(user);
  const verificationStatus =
    user.verificationStatus ?? VerificationStatus.PENDING;
  const canSubmit =
    termsAccepted &&
    profileComplete &&
    documentsComplete &&
    verificationStatus === VerificationStatus.PENDING;

  const nextStep = computeNextStep(user, {
    termsAccepted,
    avatarComplete,
    profileDetailsComplete,
    documentsComplete,
    canSubmit,
  });

  return {
    accountType: user.accountType ?? null,
    termsAccepted,
    verificationStatus,
    avatarComplete,
    profileDetailsComplete,
    profileComplete,
    documentsComplete,
    documentsSkipped,
    missingProfileFields,
    missingDocumentKeys,
    canSubmit,
    nextStep,
  };
}
