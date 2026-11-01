// Helpers for choosing the teacher of each class on the Course Offerings page.

// A class of an offering, as brain_server sends it. The day and times are null
// while the class is not in the timetable.
export type OfferingClass = {
  id: string;
  type: string;
  durationMinutes: number;
  requiresRoomType: string;
  assignedProfessorId: string | null;
  dayOfWeek: string | null;
  startTime: string | null;
  endTime: string | null;
};

// The change of one class, as brain_server expects it: professorId null takes
// the teacher off the class.
export type TeacherChange = { classId: string; professorId: string | null };

// The name of each class within its offering: "LECTURE", or "TD 1" and "TD 2"
// when the offering has more than one class of that kind.
export function classLabels(classes: { type: string }[]): string[] {
  const total = new Map<string, number>();
  for (const { type } of classes) total.set(type, (total.get(type) ?? 0) + 1);
  const seen = new Map<string, number>();
  return classes.map(({ type }) => {
    const count = (seen.get(type) ?? 0) + 1;
    seen.set(type, count);
    return total.get(type) === 1 ? type : `${type} ${count}`;
  });
}

// When a class takes place, for example "Monday 08:30-10:00", or null while it
// is not in the timetable.
export function classTime(cls: Pick<OfferingClass, 'dayOfWeek' | 'startTime' | 'endTime'>): string | null {
  const { dayOfWeek, startTime, endTime } = cls;
  if (dayOfWeek === null || startTime === null || endTime === null) return null;
  const day = dayOfWeek.charAt(0) + dayOfWeek.slice(1).toLowerCase();
  return `${day} ${startTime}-${endTime}`;
}

// The teacher of each class as the form starts: its id, or '' for no teacher.
export function teacherChoices(classes: Pick<OfferingClass, 'id' | 'assignedProfessorId'>[]): Record<string, string> {
  return Object.fromEntries(classes.map((cls) => [cls.id, cls.assignedProfessorId ?? '']));
}

// The classes whose teacher was changed in the form. Classes that keep their
// teacher (or are not in the form) are left out, so brain_server only checks
// real changes.
export function teacherChanges(
  classes: Pick<OfferingClass, 'id' | 'assignedProfessorId'>[],
  choices: Record<string, string>,
): TeacherChange[] {
  return classes
    .filter((cls) => cls.id in choices && choices[cls.id] !== (cls.assignedProfessorId ?? ''))
    .map((cls) => ({ classId: cls.id, professorId: choices[cls.id] || null }));
}
