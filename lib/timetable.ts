// Helpers for the timetable on the home page.

export type CohortClass = { cohortName: string };

// The room of a class as brain_server sends it: its name, building and floor.
export type ClassRoom = {
  name: string;
  floor: { level: string; building: { name: string; code: string } };
} | null;

// Where a class takes place, for example "Lab 304, Science Hub (SCI) - Level 3"
// (the building and floor are written as in the Classrooms page).
export function roomLabel(room: ClassRoom | undefined): string {
  if (room === null || room === undefined) return 'Room not found';
  const { building, level } = room.floor;
  return `${room.name}, ${building.name} (${building.code}) - Level ${level}`;
}

// Who teaches a class: the teacher's name, "No teacher yet" while it has none
// (choose one with Teachers on the Course Offerings page), or "Teacher not
// found" when the name is not in the list.
export function teacherLabel(
  professorId: string | null | undefined,
  teachers: { id: string; name: string }[],
): string {
  if (professorId === null || professorId === undefined) return 'No teacher yet';
  return teachers.find((teacher) => teacher.id === professorId)?.name ?? 'Teacher not found';
}

// A term as the home page lists it; the dates are ISO text, as brain_server sends them.
export type TermChoice = { id: string; name: string; type: string; startDate: string; endDate: string };

const TERM_TYPES: Record<string, string> = {
  SEMESTER_1: 'Semester 1',
  SEMESTER_2: 'Semester 2',
  SUMMER: 'Summer',
};

// "Fall 2026 (Semester 1)": how the term list names a term.
export function termLabel(term: Pick<TermChoice, 'name' | 'type'>): string {
  return `${term.name} (${TERM_TYPES[term.type] ?? term.type})`;
}

// A date as "YYYY-MM-DD" in local time, to compare with the days of the terms.
export function localDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

// The term the home page starts with: the one going on today ("YYYY-MM-DD"),
// else the next one to start, else the latest one; '' when there is no term.
export function defaultTermId(terms: Pick<TermChoice, 'id' | 'startDate' | 'endDate'>[], today: string): string {
  const day = (iso: string) => iso.slice(0, 10);
  const current = terms.find((term) => day(term.startDate) <= today && today <= day(term.endDate));
  if (current) return current.id;
  const byStart = [...terms].sort((a, b) => day(a.startDate).localeCompare(day(b.startDate)));
  const next = byStart.find((term) => day(term.startDate) > today);
  if (next) return next.id;
  return byStart.length > 0 ? byStart[byStart.length - 1].id : '';
}

// How many class blocks are shown for the chosen cohort. 'All' shows every cohort.
export function countClassesForCohort(classes: CohortClass[], cohort: string): number {
  if (cohort === 'All') return classes.length;
  return classes.filter((cls) => cls.cohortName === cohort).length;
}
