# ResQnnect Mission 9 Evacuee Verification

## Goal
Implement household QR generation, QR/manual evacuee verification, verification logs, and duplicate/conflict handling.

## Scope Delivered
- Barangay verification workflow at `/app/barangay/evacuee-verification`.
- Household QR profile at `/app/household/qr-profile`.
- QR image generation using `qrcode`.
- Browser camera QR scan flow using `html5-qrcode`.
- Manual fallback lookup by QR code, household code, or address.
- Verification logs persisted to `qr_verifications`.
- Optional verification-and-check-in flow into `evacuee_records`.

## Service Layer
- `src/services/supabase/verification.ts`
  - `searchVerificationHouseholds`
  - `findHouseholdByQrCode`
  - `getVerificationHousehold`
  - `listVerificationMembers`
  - `listVerificationLogs`
  - `createVerificationLog`

## Duplicate and Conflict Handling
- Successful verification within the recent window is recorded as `duplicate`.
- Operators can explicitly record failed/conflicting verification attempts.
- Check-in blocks active duplicate evacuee records for the same household/member.
