import type { RescueRequestStatus } from '../../constants/status';

export const RESCUE_REQUEST_STATUS_LABELS: Record<RescueRequestStatus, string> = {
  pending: 'Pending',
  acknowledged: 'Acknowledged',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  rescued: 'Rescued',
  transferred: 'Transferred',
  closed: 'Closed',
};

export const RESCUE_REQUEST_STATUS_BADGE_CLASSES: Record<RescueRequestStatus, string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-900',
  acknowledged: 'border-blue-200 bg-blue-50 text-blue-900',
  assigned: 'border-cyan-200 bg-cyan-50 text-cyan-900',
  in_progress: 'border-indigo-200 bg-indigo-50 text-indigo-900',
  rescued: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  transferred: 'border-violet-200 bg-violet-50 text-violet-900',
  closed: 'border-slate-300 bg-slate-100 text-slate-700',
};
