import type { RescueMissionStatus } from '../../constants/status';

export const RESCUE_MISSION_STATUS_LABELS: Record<RescueMissionStatus, string> = {
  queued: 'Queued',
  assigned: 'Assigned',
  en_route: 'En Route',
  on_site: 'On Site',
  pickup_complete: 'Pickup Complete',
  handover_complete: 'Handover Complete',
  closed: 'Closed',
};

export const RESCUE_MISSION_STATUS_BADGE_CLASSES: Record<RescueMissionStatus, string> = {
  queued: 'border-amber-200 bg-amber-50 text-amber-900',
  assigned: 'border-blue-200 bg-blue-50 text-blue-900',
  en_route: 'border-cyan-200 bg-cyan-50 text-cyan-900',
  on_site: 'border-indigo-200 bg-indigo-50 text-indigo-900',
  pickup_complete: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  handover_complete: 'border-teal-200 bg-teal-50 text-teal-900',
  closed: 'border-slate-300 bg-slate-100 text-slate-700',
};

export const ACTIVE_RESCUE_MISSION_STATUSES: RescueMissionStatus[] = [
  'queued',
  'assigned',
  'en_route',
  'on_site',
  'pickup_complete',
  'handover_complete',
];

export const RESCUER_UPDATEABLE_MISSION_STATUSES: RescueMissionStatus[] = [
  'assigned',
  'en_route',
  'on_site',
  'pickup_complete',
  'handover_complete',
  'closed',
];
