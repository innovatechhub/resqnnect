export const HOUSEHOLD_STATUSES = ['active', 'evacuated', 'inactive'] as const;
export type HouseholdStatus = (typeof HOUSEHOLD_STATUSES)[number];

export const HOUSEHOLD_MEMBER_SEXES = ['female', 'male', 'other'] as const;
export type HouseholdMemberSex = (typeof HOUSEHOLD_MEMBER_SEXES)[number];

export function isHouseholdStatus(value: unknown): value is HouseholdStatus {
  return typeof value === 'string' && (HOUSEHOLD_STATUSES as readonly string[]).includes(value);
}

export function isHouseholdMemberSex(value: unknown): value is HouseholdMemberSex {
  return typeof value === 'string' && (HOUSEHOLD_MEMBER_SEXES as readonly string[]).includes(value);
}
