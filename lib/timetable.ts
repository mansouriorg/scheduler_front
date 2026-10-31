// Helpers for the timetable on the home page.

export type CohortClass = { cohortName: string };

// How many class blocks are shown for the chosen cohort. 'All' shows every cohort.
export function countClassesForCohort(classes: CohortClass[], cohort: string): number {
  if (cohort === 'All') return classes.length;
  return classes.filter((cls) => cls.cohortName === cohort).length;
}
