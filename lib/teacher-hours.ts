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

// "Fall 2026: 9 of 12 hrs", one line per term, in the order brain_server sends
// them (date order).
export function weeklyHoursLines(weeks: WeeklyHours[], maxHoursPerWeek: number): HoursLine[] {
  const unit = maxHoursPerWeek === 1 ? 'hr' : 'hrs';
  return weeks.map((week) => {
    const over = week.minutesPerWeek > maxHoursPerWeek * 60;
    const hours = `${hoursOf(week.minutesPerWeek)} of ${maxHoursPerWeek} ${unit}`;
    return { key: week.termId, term: week.termName, hours, over };
  });
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
