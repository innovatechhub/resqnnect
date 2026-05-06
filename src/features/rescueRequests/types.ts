import type { RescueRequestStatus } from '../../constants/status';

export interface RescueRequestFormValues {
  emergencyType: string;
  severityLevel: string;
  peopleCount: string;
  locationText: string;
  latitude: string;
  longitude: string;
  details: string;
  photoUrl: string;
}

export interface NormalizedRescueRequestFormValues {
  emergencyType: string;
  severityLevel: number;
  peopleCount: number;
  locationText: string | null;
  latitude: number | null;
  longitude: number | null;
  details: string;
  photoUrl: string | null;
}

export interface RescueRequestStatusUpdateInput {
  requestId: string;
  status: RescueRequestStatus;
}
