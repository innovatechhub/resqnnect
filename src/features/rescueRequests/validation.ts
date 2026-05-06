import { z } from 'zod';

import type { NormalizedRescueRequestFormValues, RescueRequestFormValues } from './types';

export const INITIAL_RESCUE_REQUEST_FORM_VALUES: RescueRequestFormValues = {
  emergencyType: '',
  severityLevel: '3',
  peopleCount: '1',
  locationText: '',
  latitude: '',
  longitude: '',
  details: '',
  photoUrl: '',
};

function trimToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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

export const rescueRequestFormSchema = z
  .object({
    emergencyType: z.string().trim().min(2, 'Emergency type is required.').max(80, 'Emergency type is too long.'),
    severityLevel: z
      .string()
      .trim()
      .refine(
        (value) => Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 5,
        'Severity must be between 1 and 5.',
      ),
    peopleCount: z
      .string()
      .trim()
      .refine((value) => Number.isInteger(Number(value)) && Number(value) >= 1, 'People count must be at least 1.'),
    locationText: z.string().trim().max(200, 'Location details must not exceed 200 characters.'),
    latitude: z.string().trim(),
    longitude: z.string().trim(),
    details: z.string().trim().min(10, 'Situation details are required.').max(1000, 'Details are too long.'),
    photoUrl: z
      .string()
      .trim()
      .max(500, 'Photo URL is too long.')
      .refine((value) => !value || /^https?:\/\//i.test(value), 'Photo URL must start with http:// or https://'),
  })
  .superRefine((value, context) => {
    const latitude = parseCoordinate(value.latitude);
    const longitude = parseCoordinate(value.longitude);

    if (latitude === 'invalid') {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['latitude'],
        message: 'Latitude must be a valid number.',
      });
    } else if (latitude !== null && (latitude < -90 || latitude > 90)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['latitude'],
        message: 'Latitude must be between -90 and 90.',
      });
    }

    if (longitude === 'invalid') {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['longitude'],
        message: 'Longitude must be a valid number.',
      });
    } else if (longitude !== null && (longitude < -180 || longitude > 180)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['longitude'],
        message: 'Longitude must be between -180 and 180.',
      });
    }

    const hasLatitude = latitude !== null && latitude !== 'invalid';
    const hasLongitude = longitude !== null && longitude !== 'invalid';
    if (hasLatitude !== hasLongitude) {
      if (!hasLatitude) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['latitude'],
          message: 'Latitude is required when longitude is provided.',
        });
      }
      if (!hasLongitude) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['longitude'],
          message: 'Longitude is required when latitude is provided.',
        });
      }
    }
  });

export function normalizeRescueRequestFormValues(values: RescueRequestFormValues): NormalizedRescueRequestFormValues {
  const latitude = parseCoordinate(values.latitude);
  const longitude = parseCoordinate(values.longitude);

  return {
    emergencyType: values.emergencyType.trim(),
    severityLevel: Number(values.severityLevel.trim()),
    peopleCount: Number(values.peopleCount.trim()),
    locationText: trimToNull(values.locationText),
    latitude: latitude === null ? null : (latitude as number),
    longitude: longitude === null ? null : (longitude as number),
    details: values.details.trim(),
    photoUrl: trimToNull(values.photoUrl),
  };
}
