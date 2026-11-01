// How long each room is used each week in the timetable of one term: the "Weekly Use"
// column of the Classrooms page, so that rooms that are not used, or nearly full,
// stand out.

// The week of the timetable as scheduler-brain builds it: Monday to Saturday, 08:00 to
// 18:30 (21 blocks of 30 minutes a day). A room can be used 63 hours a week.
export const WEEK_MINUTES = 6 * 21 * 30;

// From this share of the week on, a room is nearly full.
const NEARLY_FULL = 0.8;

// What the Classrooms page needs of an offering (GET /course-offerings).
export type RoomUseOffering = {
  termId: string;
  classes?: { assignedRoomId?: string | null; startTime: string | null; durationMinutes: number }[];
};

// The term of the column, and the minutes a week of each room (by id) in its timetable.
export type RoomUse = { termName: string; minutes: Record<string, number> };

// The minutes a week each room is used by the classes of the term that are in the
// timetable (with a room and a time). Classes of other terms do not count.
export function roomUse(offerings: RoomUseOffering[], termId: string, termName: string): RoomUse {
  const minutes: Record<string, number> = {};
  for (const offering of offerings) {
    if (offering.termId !== termId) continue;
    for (const cls of offering.classes ?? []) {
      const roomId = cls.assignedRoomId;
      if (roomId && cls.startTime !== null) minutes[roomId] = (minutes[roomId] ?? 0) + cls.durationMinutes;
    }
  }
  return { termName, minutes };
}

// True from 80% of the week on: the page then says "nearly full".
export function isNearlyFull(minutes: number): boolean {
  return minutes >= WEEK_MINUTES * NEARLY_FULL;
}

const hours = (minutes: number) => String(Math.round((minutes / 60) * 100) / 100);

// "9 of 63 hrs", or "Not used". The page adds "nearly full" under it (isNearlyFull).
export function roomUseText(minutes: number): string {
  return minutes <= 0 ? 'Not used' : `${hours(minutes)} of ${hours(WEEK_MINUTES)} hrs`;
}
