import type { HouseholdMemberSex, HouseholdStatus } from '../../constants/households';

export interface HouseholdFormValues {
  householdCode: string;
  addressText: string;
  status: HouseholdStatus;
  qrCode: string;
  latitude: string;
  longitude: string;
}

export interface HouseholdFormErrors {
  householdCode?: string;
  addressText?: string;
  qrCode?: string;
  latitude?: string;
  longitude?: string;
}

export interface NormalizedHouseholdInput {
  householdCode: string | null;
  addressText: string;
  status: HouseholdStatus;
  qrCode: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface HouseholdMemberFormValues {
  fullName: string;
  relationshipToHead: string;
  birthDate: string;
  sex: HouseholdMemberSex | '';
  isVulnerable: boolean;
  vulnerabilityNotes: string;
}

export interface HouseholdMemberFormErrors {
  fullName?: string;
  relationshipToHead?: string;
  birthDate?: string;
  sex?: string;
  vulnerabilityNotes?: string;
}

export interface NormalizedHouseholdMemberInput {
  fullName: string;
  relationshipToHead: string | null;
  birthDate: string | null;
  sex: HouseholdMemberSex | null;
  isVulnerable: boolean;
  vulnerabilityNotes: string | null;
}
