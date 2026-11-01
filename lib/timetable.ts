// Helpers for the timetable on the home page.

// The room of a class as brain_server sends it: its name, building and floor.
export type ClassRoom = {
  name: string;
  floor: { level: string; building: { name: string; code: string } };
} | null;

// A course offering as GET /course-offerings sends it: the parts the home page
// uses. The day and times of a class are null while it is not in the timetable.
export type OfferingRow = {
  termId: string;
  course: { code: string; title: string };
  cohort: { name: string };
  classes?: {
    id: string;
    type: string;
    durationMinutes: number;
    dayOfWeek: string | null;
    startTime: string | null;
    endTime: string | null;
    assignedProfessorId: string | null;
    assignedRoomId?: string | null;
    room?: ClassRoom;
  }[];
};

// A class on the timetable of the home page, with its names written out.
export type TimetableClass = {
  id: string;
  termId: string;
  courseCode: string;
  courseTitle: string;
  cohortName: string;
  type: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string | null;
  room: string;
  teacher: string;
  // Their ids, for the View list (null: no room or no teacher yet).
  roomId: string | null;
  teacherId: string | null;
};

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

// A class as the View list reads it.
export type ViewClass = Pick<TimetableClass, 'cohortName' | 'room' | 'roomId' | 'teacher' | 'teacherId'>;

// A choice of the View list: its value ("cohort:SE - Year 1", "teacher:<id>" or
// "room:<id>") and its text.
export type ViewChoice = { value: string; label: string };

// The value of the View list that shows every class.
export const ALL_CLASSES = 'All';

// The choices of the View list for the classes of a term: their cohorts, their
// teachers and their rooms, each once and sorted by name. Classes without a
// teacher or a room yet add no choice.
export function viewChoices(classes: ViewClass[]): { cohorts: ViewChoice[]; teachers: ViewChoice[]; rooms: ViewChoice[] } {
  const cohorts = new Map<string, string>();
  const teachers = new Map<string, string>();
  const rooms = new Map<string, string>();
  for (const cls of classes) {
    cohorts.set(`cohort:${cls.cohortName}`, cls.cohortName);
    if (cls.teacherId !== null) teachers.set(`teacher:${cls.teacherId}`, cls.teacher);
    if (cls.roomId !== null) rooms.set(`room:${cls.roomId}`, cls.room);
  }
  const sorted = (choices: Map<string, string>) =>
    [...choices].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  return { cohorts: sorted(cohorts), teachers: sorted(teachers), rooms: sorted(rooms) };
}

// True when the View list shows the class: every class for ALL_CLASSES, else the
// classes of one cohort, one teacher or one room.
export function inView(cls: ViewClass, view: string): boolean {
  if (view === ALL_CLASSES || view === `cohort:${cls.cohortName}`) return true;
  if (cls.teacherId !== null && view === `teacher:${cls.teacherId}`) return true;
  return cls.roomId !== null && view === `room:${cls.roomId}`;
}

// How many class blocks the view shows, on all days.
export function countClassesInView(classes: ViewClass[], view: string): number {
  return classes.filter((cls) => inView(cls, view)).length;
}

// A class of a term that is not in the timetable yet: Generate still has to place
// it. It has no room, so it is in no room's week.
export type UnplacedClass = ViewClass & {
  id: string;
  termId: string;
  courseCode: string;
  type: string;
  durationMinutes: number;
};

// The classes of the offerings that have no day or time yet, sorted by course,
// cohort and kind of class.
export function unplacedClasses(offerings: OfferingRow[], teachers: { id: string; name: string }[]): UnplacedClass[] {
  const unplaced: UnplacedClass[] = [];
  for (const offering of offerings) {
    for (const cls of offering.classes ?? []) {
      if (cls.dayOfWeek !== null && cls.startTime !== null) continue;
      unplaced.push({
        id: cls.id,
        termId: offering.termId,
        courseCode: offering.course.code,
        cohortName: offering.cohort.name,
        type: cls.type,
        durationMinutes: cls.durationMinutes,
        teacher: teacherLabel(cls.assignedProfessorId, teachers),
        teacherId: cls.assignedProfessorId,
        room: 'No room yet',
        roomId: null,
      });
    }
  }
  return unplaced.sort(
    (a, b) =>
      a.courseCode.localeCompare(b.courseCode) ||
      a.cohortName.localeCompare(b.cohortName) ||
      a.type.localeCompare(b.type),
  );
}

// "3 classes of Fall 2026 are not in the timetable yet" (of: the term, or the
// cohort or teacher of the View list).
export function unplacedSummary(count: number, of: string): string {
  return count === 1
    ? `1 class of ${of} is not in the timetable yet`
    : `${count} classes of ${of} are not in the timetable yet`;
}

// "DEV-101 TD for SE - Year 1: 120 mins, Dr. Amal Ben Salah" (or "No teacher yet").
export function unplacedLabel(cls: UnplacedClass): string {
  return `${cls.courseCode} ${cls.type} for ${cls.cohortName}: ${cls.durationMinutes} mins, ${cls.teacher}`;
}

// The line at the top of the printed week (Print week on the home page): the term,
// the cohort, teacher or room of the View list, and the number of class blocks.
// "Fall 2026 timetable: Dr. Amal Ben Salah (2 class blocks)"
export function printHeading(term: string, view: string | undefined, count: number): string {
  return `${term} timetable: ${view ?? 'all classes'} (${count} ${count === 1 ? 'class block' : 'class blocks'})`;
}
