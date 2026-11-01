// The hours a week each teacher already teaches, on the Teachers page. brain_server
// sends them with each teacher (GET /professors, weeklyHours): one entry per term in
// which the teacher has classes, counted as its check of the maximum counts them
// (every class, in the timetable or not; the classes of terms whose dates overlap
// together).

// How long a teacher teaches each week of a term.
export type WeeklyHours = { termId: string; termName: string; minutesPerWeek: number };

// A line under the maximum in the table: the term, and the hours ("9 of 12 hrs",
// kept on one line). over: the teacher teaches more than the maximum in that term
// (for example after the dates of two terms were changed so that they overlap);
// shown in red, with ", over the maximum".
export type HoursLine = { key: string; term: string; hours: string; over: boolean };

// "1", "9", "13.5": the hours of a number of minutes, as brain_server writes them.
export function hoursOf(minutes: number): string {
  return String(Number((minutes / 60).toFixed(2)));
}

// "9 of 12 hrs" ("1 of 1 hr"): the hours a week of a teacher, and their maximum.
export function hoursOfMaximum(minutes: number, maxHoursPerWeek: number): string {
  return `${hoursOf(minutes)} of ${maxHoursPerWeek} ${maxHoursPerWeek === 1 ? 'hr' : 'hrs'}`;
}

// "Fall 2026: 9 of 12 hrs", one line per term, in the order brain_server sends
// them (date order).
export function weeklyHoursLines(weeks: WeeklyHours[], maxHoursPerWeek: number): HoursLine[] {
  return weeks.map((week) => ({
    key: week.termId,
    term: week.termName,
    hours: hoursOfMaximum(week.minutesPerWeek, maxHoursPerWeek),
    over: week.minutesPerWeek > maxHoursPerWeek * 60,
  }));
}

// Under the maximum in the form, while a teacher is changed: the lowest maximum
// brain_server accepts, and why. null when the teacher has no classes (or the list
// did not come).
export function maximumHint(name: string, weeks: WeeklyHours[] | undefined): string | null {
  if (weeks === undefined || weeks.length === 0) return null;
  const busiest = weeks.reduce((most, week) => (week.minutesPerWeek > most.minutesPerWeek ? week : most));
  const hours = hoursOf(busiest.minutesPerWeek);
  const unit = hours === '1' ? 'hour' : 'hours';
  return `${name} already teaches ${hours} ${unit} a week in ${busiest.termName}, so the maximum cannot be lower than ${hours}.`;
}

// A teacher as the lists of the Course Offerings page show them.
type ListedTeacher = { name: string; department: string; maxHoursPerWeek: number };

// "1 hour", "10.5 hours".
const hoursWord = (hours: string) => (hours === '1' ? '1 hour' : `${hours} hours`);

// A teacher in the list of a class on the Course Offerings page, with the hours a
// week they would teach with that class: "Dr. Amal Ben Salah: 10.5 of 12 hrs
// (Computer Science)", ", over the maximum" after the hours when they would teach
// more than that, and ", not free at that time" when the class is in the
// timetable and they are away or teach another class then. The department comes
// last, so that a narrow list cuts it first.
export function teacherOptionText(teacher: ListedTeacher, minutes: number, notFree = false): string {
  const over = minutes > teacher.maxHoursPerWeek * 60 ? ', over the maximum' : '';
  const busy = notFree ? ', not free at that time' : '';
  return `${teacher.name}: ${hoursOfMaximum(minutes, teacher.maxHoursPerWeek)}${over}${busy} (${teacher.department})`;
}

// Under the list of a class, for the teacher chosen: "With this class: 9 of 12 hrs
// a week", and ", over the maximum" (over: true) when they would teach more than
// that. The list itself may be too narrow to show the hours of its choice.
export function withClassLine(minutes: number, maxHoursPerWeek: number): { text: string; over: boolean } {
  const over = minutes > maxHoursPerWeek * 60;
  const text = `With this class: ${hoursOfMaximum(minutes, maxHoursPerWeek)} a week${over ? ', over the maximum' : ''}`;
  return { text, over };
}

// Above Save in the Teachers form, for a teacher who gets a class and would then
// teach more than their maximum a week in the term: brain_server refuses to save
// that. null when they would not.
export function overMaximumText(teacher: ListedTeacher, minutes: number, termName: string): string | null {
  if (minutes <= teacher.maxHoursPerWeek * 60) return null;
  return `${teacher.name} would teach ${hoursWord(hoursOf(minutes))} a week in ${termName}, more than their maximum of ${hoursWord(String(teacher.maxHoursPerWeek))}.`;
}
