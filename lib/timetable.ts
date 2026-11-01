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

// How many class blocks are shown for the chosen cohort. 'All' shows every cohort.
export function countClassesForCohort(classes: CohortClass[], cohort: string): number {
  if (cohort === 'All') return classes.length;
  return classes.filter((cls) => cls.cohortName === cohort).length;
}
