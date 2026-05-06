import type { RescueMissionStatus } from '../../constants/status';

export interface RescueAssignmentFormValues {
  rescueRequestId: string;
  assignedTo: string;
  teamName: string;
  assignmentNotes: string;
}

export interface NormalizedRescueAssignmentFormValues {
  rescueRequestId: string;
  assignedTo: string;
  teamName: string | null;
  assignmentNotes: string | null;
}

export interface RescueAssignmentStatusUpdateInput {
  assignmentId: string;
  status: RescueMissionStatus;
}
