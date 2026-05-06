export const RESCUE_REQUEST_STATUSES = [
  'pending',
  'acknowledged',
  'assigned',
  'in_progress',
  'rescued',
  'transferred',
  'closed',
] as const;

export type RescueRequestStatus = (typeof RESCUE_REQUEST_STATUSES)[number];

export const RESCUE_MISSION_STATUSES = [
  'queued',
  'assigned',
  'en_route',
  'on_site',
  'pickup_complete',
  'handover_complete',
  'closed',
] as const;

export type RescueMissionStatus = (typeof RESCUE_MISSION_STATUSES)[number];

export function isRescueMissionStatus(value: unknown): value is RescueMissionStatus {
  return typeof value === 'string' && (RESCUE_MISSION_STATUSES as readonly string[]).includes(value);
}

export function isRescueRequestStatus(value: unknown): value is RescueRequestStatus {
  return typeof value === 'string' && (RESCUE_REQUEST_STATUSES as readonly string[]).includes(value);
}
