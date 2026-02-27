import { z } from 'zod';

export const professorSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  department: z.string().min(2, 'Department is required'),
  maxHoursPerWeek: z.coerce.number().min(1, 'Must be at least 1 hour').max(60, 'Cannot exceed 60 hours'),
  timePreference: z.enum(['MORNING', 'AFTERNOON', 'EVENING', 'NO_PREFERENCE']),
});

export type ProfessorFormValues = z.infer<typeof professorSchema>;