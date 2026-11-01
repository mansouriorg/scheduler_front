// How many hours a week each cohort has classes in the timetable of one term, and how
// many hours of its classes are not in the timetable yet: the "Weekly Hours" column of
// the Cohorts page.

// What the Cohorts page needs of an offering (GET /course-offerings).
export type CohortHoursOffering = {
  termId: string;
  cohortId: string;
  classes?: { startTime: string | null; durationMinutes: number }[];
};

// The term of the column, and per cohort (by id) the minutes a week of its classes in
// the timetable (placed) and of its classes that are not in it yet (unplaced).
export type CohortHours = { termName: string; placed: Record<string, number>; unplaced: Record<string, number> };

// The minutes a week of each cohort's classes of the term, in the timetable or not yet.
// Classes of other terms do not count.
export function cohortHours(offerings: CohortHoursOffering[], termId: string, termName: string): CohortHours {
  const placed: Record<string, number> = {};
  const unplaced: Record<string, number> = {};
  for (const offering of offerings) {
    if (offering.termId !== termId) continue;
    for (const cls of offering.classes ?? []) {
      const into = cls.startTime !== null ? placed : unplaced;
      into[offering.cohortId] = (into[offering.cohortId] ?? 0) + cls.durationMinutes;
    }
  }
  return { termName, placed, unplaced };
}

// "1 hr", "13.5 hrs", "1.67 hrs".
function hoursText(minutes: number): string {
  const hours = String(Math.round((minutes / 60) * 100) / 100);
  return `${hours} ${hours === '1' ? 'hr' : 'hrs'}`;
}

// "18 hrs a week", or "No classes" when the cohort has no class in the term at all.
export function cohortHoursText(placed: number, unplaced: number): string {
  return placed <= 0 && unplaced <= 0 ? 'No classes' : `${hoursText(placed)} a week`;
}

// "3 hrs not placed yet", or null when every class of the cohort is in the timetable.
export function notPlacedText(unplaced: number): string | null {
  return unplaced > 0 ? `${hoursText(unplaced)} not placed yet` : null;
}
