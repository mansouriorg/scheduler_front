import { z } from 'zod';

// Rules for the "Add New Course Blueprint" form on /courses.
// brain_server checks the same fields again (CreateCourseDto).

export const componentSchema = z.object({
  type: z.enum(['LECTURE', 'TD', 'TP']),
  totalComponentHours: z.number().min(1, 'Required'),
  hoursPerSession: z.number().min(0.5, 'Required'),
  requiresRoomType: z.enum(['AMPHI', 'CLASSROOM', 'COMPUTER_LAB', 'WORKSHOP', 'CHEMISTRY_LAB']),
  requiredEquipment: z.array(z.string()),
});

export const courseSchema = z
  .object({
    code: z.string().min(2, 'Code is required (e.g., DEV-101)'),
    title: z.string().min(2, 'Title is required'),
    credits: z
      .number({ error: 'Enter the number of credits' })
      .int('Credits must be a whole number')
      .min(1, 'Credits must be at least 1')
      .max(30, 'Credits cannot be more than 30'),
    totalHours: z.number().min(1, 'Total hours required'),
    offeredInTerms: z
      .array(z.enum(['SEMESTER_1', 'SEMESTER_2', 'SUMMER']))
      .min(1, 'Select at least one term'),
    componentsTemplate: z.array(componentSchema).min(1, 'Add at least one teaching component'),
  })
  .refine(
    (data) => {
      // The hours of all parts must add up exactly to the course hours.
      const sum = data.componentsTemplate.reduce((acc, curr) => acc + curr.totalComponentHours, 0);
      return sum === data.totalHours;
    },
    {
      message: 'The sum of component hours must exactly equal the Total Course Hours',
      path: ['totalHours'],
    },
  );

export type CourseFormValues = z.infer<typeof courseSchema>;
