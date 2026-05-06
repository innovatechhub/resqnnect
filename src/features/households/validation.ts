import { isHouseholdMemberSex } from '../../constants/households';
import type {
  HouseholdFormErrors,
  HouseholdFormValues,
  HouseholdMemberFormErrors,
  HouseholdMemberFormValues,
  NormalizedHouseholdInput,
  NormalizedHouseholdMemberInput,
} from './types';

const MAX_CODE_LENGTH = 64;
const MAX_QR_LENGTH = 255;
const MAX_RELATIONSHIP_LENGTH = 80;
const MAX_NOTES_LENGTH = 300;

export const INITIAL_HOUSEHOLD_FORM_VALUES: HouseholdFormValues = {
  householdCode: '',
  addressText: '',
  status: 'active',
  qrCode: '',
  latitude: '',
  longitude: '',
};

export const INITIAL_MEMBER_FORM_VALUES: HouseholdMemberFormValues = {
  fullName: '',
  relationshipToHead: '',
  birthDate: '',
  sex: '',
  isVulnerable: false,
  vulnerabilityNotes: '',
};

interface HouseholdValidationResult {
  errors: HouseholdFormErrors;
  normalized: NormalizedHouseholdInput | null;
}

interface HouseholdMemberValidationResult {
  errors: HouseholdMemberFormErrors;
  normalized: NormalizedHouseholdMemberInput | null;
}

function trimToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function parseCoordinate(rawValue: string): number | null | 'invalid' {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return 'invalid';
  }

  return parsed;
}

export function validateHouseholdForm(values: HouseholdFormValues): HouseholdValidationResult {
  const errors: HouseholdFormErrors = {};

  const addressText = values.addressText.trim();
  if (!addressText) {
    errors.addressText = 'Address is required.';
  } else if (addressText.length < 8) {
    errors.addressText = 'Address should be at least 8 characters.';
  }

  const householdCode = trimToNull(values.householdCode);
  if (householdCode && householdCode.length > MAX_CODE_LENGTH) {
    errors.householdCode = `Household code must not exceed ${MAX_CODE_LENGTH} characters.`;
  }

  const qrCode = trimToNull(values.qrCode);
  if (qrCode && qrCode.length > MAX_QR_LENGTH) {
    errors.qrCode = `QR code must not exceed ${MAX_QR_LENGTH} characters.`;
  }

  const latitude = parseCoordinate(values.latitude);
  const longitude = parseCoordinate(values.longitude);

  if (latitude === 'invalid') {
    errors.latitude = 'Latitude must be a valid number.';
  } else if (latitude !== null && (latitude < -90 || latitude > 90)) {
    errors.latitude = 'Latitude must be between -90 and 90.';
  }

  if (longitude === 'invalid') {
    errors.longitude = 'Longitude must be a valid number.';
  } else if (longitude !== null && (longitude < -180 || longitude > 180)) {
    errors.longitude = 'Longitude must be between -180 and 180.';
  }

  const hasLatitude = latitude !== null && latitude !== 'invalid';
  const hasLongitude = longitude !== null && longitude !== 'invalid';
  if (hasLatitude !== hasLongitude) {
    if (!hasLatitude) {
      errors.latitude = 'Latitude is required when longitude is provided.';
    }
    if (!hasLongitude) {
      errors.longitude = 'Longitude is required when latitude is provided.';
    }
  }

  if (Object.keys(errors).length > 0) {
    return { errors, normalized: null };
  }

  return {
    errors,
    normalized: {
      householdCode,
      addressText,
      status: values.status,
      qrCode,
      latitude: latitude === null ? null : (latitude as number),
      longitude: longitude === null ? null : (longitude as number),
    },
  };
}

export function validateHouseholdMemberForm(values: HouseholdMemberFormValues): HouseholdMemberValidationResult {
  const errors: HouseholdMemberFormErrors = {};

  const fullName = values.fullName.trim();
  if (!fullName) {
    errors.fullName = 'Full name is required.';
  } else if (fullName.length < 2) {
    errors.fullName = 'Full name should be at least 2 characters.';
  }

  const relationshipToHead = trimToNull(values.relationshipToHead);
  if (relationshipToHead && relationshipToHead.length > MAX_RELATIONSHIP_LENGTH) {
    errors.relationshipToHead = `Relationship must not exceed ${MAX_RELATIONSHIP_LENGTH} characters.`;
  }

  const birthDate = trimToNull(values.birthDate);
  if (birthDate) {
    const parsedDate = new Date(`${birthDate}T00:00:00`);
    if (Number.isNaN(parsedDate.getTime())) {
      errors.birthDate = 'Birth date is invalid.';
    } else {
      const today = new Date();
      const todayAtMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      if (parsedDate > todayAtMidnight) {
        errors.birthDate = 'Birth date cannot be in the future.';
      }
    }
  }

  if (values.sex && !isHouseholdMemberSex(values.sex)) {
    errors.sex = 'Sex must be female, male, or other.';
  }

  const vulnerabilityNotes = trimToNull(values.vulnerabilityNotes);
  if (values.isVulnerable && !vulnerabilityNotes) {
    errors.vulnerabilityNotes = 'Vulnerability notes are required when marked vulnerable.';
  } else if (vulnerabilityNotes && vulnerabilityNotes.length > MAX_NOTES_LENGTH) {
    errors.vulnerabilityNotes = `Vulnerability notes must not exceed ${MAX_NOTES_LENGTH} characters.`;
  }

  if (Object.keys(errors).length > 0) {
    return { errors, normalized: null };
  }

  return {
    errors,
    normalized: {
      fullName,
      relationshipToHead,
      birthDate,
      sex: values.sex ? values.sex : null,
      isVulnerable: values.isVulnerable,
      vulnerabilityNotes,
    },
  };
}
