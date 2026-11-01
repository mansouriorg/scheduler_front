// Helpers for choosing the teacher of each class on the Course Offerings page.

import type { TimeOff } from './teacher-times';

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

// An offering as the time check reads it: its names, the dates of its term, and
// its classes with their day and time (null while not in the timetable).
export type TimeOffering = HoursOffering & {
  course: { code: string };
  cohort: { name: string };
  classes: Pick<OfferingClass, 'id' | 'type' | 'durationMinutes' | 'assignedProfessorId' | 'dayOfWeek' | 'startTime' | 'endTime'>[];
};

// Why a teacher cannot teach a class at its time: a time off of theirs, or
// another class they teach then ("DB-201 TD for SE - Year 2").
export type NotFree =
  | { kind: 'away'; dayOfWeek: string; startTime: string; endTime: string }
  | { kind: 'teaching'; label: string; startTime: string; endTime: string };

// "MONDAY" -> "Monday".
const dayOf = (day: string) => day.charAt(0) + day.slice(1).toLowerCase();

// True when two times ("HH:mm") on the same day share some minutes. A class that
// ends at 10:00 and one that starts at 10:00 do not.
const overlaps = (a: { startTime: string; endTime: string }, b: { startTime: string; endTime: string }) =>
  a.startTime < b.endTime && b.startTime < a.endTime;

// "DEV-101 LECTURE for SE - Year 1", as brain_server names a class.
const classLabel = (offering: Pick<TimeOffering, 'course' | 'cohort'>, type: string) =>
  `${offering.course.code} ${type} for ${offering.cohort.name}`;

// For one class of the offering that is in the timetable: the teachers who are
// not free at its time, and why. A time off comes first; then another class in
// the timetable that they teach in the same weeks (an offering whose term shares
// a day with this one), as saved. brain_server checks the same when it saves a
// new teacher for the class. Empty while the class is not in the timetable.
export function notFreeTeachers(
  offerings: TimeOffering[],
  offering: TimeOffering,
  cls: Pick<OfferingClass, 'dayOfWeek' | 'startTime' | 'endTime'>,
  teachers: { id: string; unavailability?: TimeOff[] }[],
): Map<string, NotFree> {
  const reasons = new Map<string, NotFree>();
  const { dayOfWeek, startTime, endTime } = cls;
  if (dayOfWeek === null || startTime === null || endTime === null) return reasons;
  const when = { startTime, endTime };
  for (const teacher of teachers) {
    const away = (teacher.unavailability ?? []).find((time) => time.dayOfWeek === dayOfWeek && overlaps(time, when));
    if (away) reasons.set(teacher.id, { kind: 'away', dayOfWeek, startTime: away.startTime, endTime: away.endTime });
  }
  for (const other of offerings) {
    if (other.id === offering.id || termsOverlap(other.term, offering.term) === false) continue;
    for (const taught of other.classes) {
      const teacherId = taught.assignedProfessorId;
      if (teacherId === null || reasons.has(teacherId) || taught.dayOfWeek !== dayOfWeek) continue;
      if (taught.startTime === null || taught.endTime === null) continue;
      if (overlaps({ startTime: taught.startTime, endTime: taught.endTime }, when)) {
        const label = classLabel(other, taught.type);
        reasons.set(teacherId, { kind: 'teaching', label, startTime: taught.startTime, endTime: taught.endTime });
      }
    }
  }
  return reasons;
}

// Under the list of a class, when its chosen teacher is not free at its time:
// "Not free at that time: times off on Monday from 08:00 to 12:00", or "Not free
// at that time: teaches DB-201 TD for SE - Year 2 from 08:30 to 10:00".
export function notFreeLine(reason: NotFree): string {
  return reason.kind === 'away'
    ? `Not free at that time: times off on ${dayOf(reason.dayOfWeek)} from ${reason.startTime} to ${reason.endTime}`
    : `Not free at that time: teaches ${reason.label} from ${reason.startTime} to ${reason.endTime}`;
}

// Above Save, for a class that gets a new teacher who is not free at its time:
// the sentence brain_server answers when it refuses to save that.
export function notFreeText(
  name: string,
  offering: Pick<TimeOffering, 'course' | 'cohort'>,
  cls: Pick<OfferingClass, 'type' | 'dayOfWeek' | 'startTime' | 'endTime'>,
  reason: NotFree,
): string {
  const day = dayOf(cls.dayOfWeek ?? '');
  const what = `${name} cannot teach ${classLabel(offering, cls.type)} on ${day} from ${cls.startTime} to ${cls.endTime}`;
  return reason.kind === 'away'
    ? `${what}, because ${name} is not available on ${day} from ${reason.startTime} to ${reason.endTime}.`
    : `${what}, because at that time ${name} teaches ${reason.label} (${reason.startTime} to ${reason.endTime}).`;
}
