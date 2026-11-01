// The times off of a teacher (Teachers page): the times each week when the
// teacher cannot teach. Times are "HH:mm", on the half-hour grid of the
// timetable, from 08:00 to 18:30.

export type TimeOff = { dayOfWeek: string; startTime: string; endTime: string };

export const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

// Every half hour from 08:00 to 18:30.
const GRID = Array.from({ length: 22 }, (_, index) => {
  const minutes = 8 * 60 + index * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${minutes % 60 === 0 ? '00' : '30'}`;
});

// A time off starts from 08:00 to 18:00 and ends from 08:30 to 18:30.
export const START_TIMES = GRID.slice(0, -1);
export const END_TIMES = GRID.slice(1);

// "MONDAY" -> "Monday".
export function dayName(day: string): string {
  return day.charAt(0) + day.slice(1).toLowerCase();
}

// "Mon 08:00-12:00", or "Mon, all day" from 08:00 to 18:30 (short, for the table).
export function timeOffLabel(time: TimeOff): string {
  const day = dayName(time.dayOfWeek).slice(0, 3);
  if (time.startTime === '08:00' && time.endTime === '18:30') return `${day}, all day`;
  return `${day} ${time.startTime}-${time.endTime}`;
}

// The times off in the order of the week, the earliest first on each day.
export function sortTimesOff<T extends TimeOff>(times: T[]): T[] {
  return [...times].sort(
    (a, b) => DAYS.indexOf(a.dayOfWeek) - DAYS.indexOf(b.dayOfWeek) || a.startTime.localeCompare(b.startTime),
  );
}

// A new time off: the whole of the first day that has none yet.
export function nextTimeOff(times: TimeOff[]): TimeOff {
  const day = DAYS.find((one) => times.every((time) => time.dayOfWeek !== one)) ?? DAYS[0];
  return { dayOfWeek: day, startTime: '08:00', endTime: '18:30' };
}

// Why the times off cannot be saved, in one sentence, or null when they can.
// The times off are numbered from 1, as on the page. Two times that only
// touch (one ends at 10:00, the next starts at 10:00) do not overlap.
export function timesOffProblem(times: TimeOff[]): string | null {
  for (let index = 0; index < times.length; index++) {
    if (times[index].startTime >= times[index].endTime) return `Time off ${index + 1} must end after it starts.`;
  }
  for (let a = 0; a < times.length; a++) {
    for (let b = a + 1; b < times.length; b++) {
      const one = times[a];
      const other = times[b];
      if (one.dayOfWeek === other.dayOfWeek && one.startTime < other.endTime && other.startTime < one.endTime) {
        return `Time off ${a + 1} and time off ${b + 1} overlap on ${dayName(one.dayOfWeek)}. Make them one time off.`;
      }
    }
  }
  return null;
}
