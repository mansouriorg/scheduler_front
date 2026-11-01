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

// An offering as the weekly hours read it: the dates of its term, and its classes
// with their length and their teacher as saved.
export type HoursOffering = {
  id: string;
  term: { startDate: string; endDate: string };
  classes: Pick<OfferingClass, 'id' | 'durationMinutes' | 'assignedProfessorId'>[];
};

// True when two terms share at least one day: their classes are taught in the
// same weeks.
function termsOverlap(a: HoursOffering['term'], b: HoursOffering['term']): boolean {
  return Date.parse(a.startDate) <= Date.parse(b.endDate) && Date.parse(b.startDate) <= Date.parse(a.endDate);
}

// The minutes a week each teacher teaches in the weeks of the offering's term,
// with the teachers chosen in the form: their classes of every other offering
// whose term shares a day with it (as saved), and the classes of this offering
// as chosen. leaveOut: a class counted for no teacher, so that the form can add
// it to each teacher in its list. brain_server counts the same way when it saves
// the teachers, and refuses a teacher who would go over their maximum.
export function teacherMinutes(
  offerings: HoursOffering[],
  offering: HoursOffering,
  choices: Record<string, string>,
  leaveOut?: string,
): Map<string, number> {
  const minutes = new Map<string, number>();
  const add = (teacherId: string | null, length: number) => {
    if (teacherId) minutes.set(teacherId, (minutes.get(teacherId) ?? 0) + length);
  };
  for (const other of offerings) {
    if (other.id === offering.id || termsOverlap(other.term, offering.term) === false) continue;
    for (const cls of other.classes) add(cls.assignedProfessorId, cls.durationMinutes);
  }
  for (const cls of offering.classes) {
    if (cls.id === leaveOut) continue;
    add(cls.id in choices ? choices[cls.id] : cls.assignedProfessorId, cls.durationMinutes);
  }
  return minutes;
}
