import { z } from 'zod';

import type { NormalizedRescueAssignmentFormValues, RescueAssignmentFormValues } from './types';

export const INITIAL_RESCUE_ASSIGNMENT_FORM_VALUES: RescueAssignmentFormValues = {
  rescueRequestId: '',
  assignedTo: '',
  teamName: '',
  assignmentNotes: '',
};

export const rescueAssignmentFormSchema = z.object({
  rescueRequestId: z.string().trim().min(1, 'Select a rescue request.'),
  assignedTo: z.string().trim().min(1, 'Select a rescuer.'),
  teamName: z.string().trim().max(80, 'Team name must not exceed 80 characters.'),
  assignmentNotes: z.string().trim().max(500, 'Assignment notes must not exceed 500 characters.'),
});

function trimToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeRescueAssignmentFormValues(
  values: RescueAssignmentFormValues,
): NormalizedRescueAssignmentFormValues {
  return {
    rescueRequestId: values.rescueRequestId.trim(),
    assignedTo: values.assignedTo.trim(),
    teamName: trimToNull(values.teamName),
    assignmentNotes: trimToNull(values.assignmentNotes),
  };
}
