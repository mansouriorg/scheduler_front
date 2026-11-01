// Search in the tables (Teachers, Classrooms, Courses, Course Offerings), with or
// without capitals and accents. A row is shown when what is typed is in one of its
// values ("lab 3" finds "Lab 304"), or when every word typed is in it, in any order
// and in any column ("ali info" finds "Dr. Ali Ben Salah, Informatique"). A number
// among the words must be a whole number of the row: "year 2" finds "SE - Year 2",
// not "SE - Year 1" in "Fall 2026".

// A value of a row that can be searched (null and undefined count as empty).
export type SearchValue = string | number | null | undefined;

// After normalize('NFD') an accent is a character of its own, after its letter
// (code 0x300 to 0x36F).
const isAccent = (char: string) => char.charCodeAt(0) >= 0x300 && char.charCodeAt(0) <= 0x36f;

// The text as it is compared: small letters, no accents, single spaces.
export function searchText(text: string): string {
  return Array.from(text.normalize('NFD'))
    .filter((char) => isAccent(char) === false)
    .join('')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// The words typed in a search box (none while it is empty or has only spaces).
export function searchWords(query: string): string[] {
  const text = searchText(query);
  return text === '' ? [] : text.split(' ');
}

// True when the row (its values) has what is typed: see the top of this file.
export function matchesSearch(values: SearchValue[], query: string): boolean {
  const typed = searchText(query);
  if (typed === '') return true;
  // One line per value, so that nothing typed is found across two values.
  const text = values.map((value) => searchText(String(value ?? ''))).join('\n');
  if (text.includes(typed)) return true;
  const numbers: string[] = text.match(/\d+/g) ?? [];
  return typed
    .split(' ')
    .every((word) => (/^\d+$/.test(word) ? numbers.includes(word) : text.includes(word)));
}

// The rows that have what is typed, in their order; all rows while nothing is typed.
export function filterBySearch<T>(rows: T[], query: string, valuesOf: (row: T) => SearchValue[]): T[] {
  if (searchWords(query).length === 0) return rows;
  return rows.filter((row) => matchesSearch(valuesOf(row), query));
}

// The Locations page: the buildings that have what is typed in their campus, name,
// code or floors ("Level 2"), and the campuses whose name has it or that have such a
// building. A campus found by its name keeps all its buildings, since they all have
// its name. The floors of a building found are all shown with it.
export function searchLocations<
  Campus extends { id: string; name: string },
  Building extends { id: string; name: string; code: string; campusId: string },
>(
  campuses: Campus[],
  buildings: Building[],
  floors: { buildingId: string; level: string }[],
  query: string,
): { campuses: Campus[]; buildings: Building[] } {
  const shownBuildings = filterBySearch(buildings, query, (building) => [
    campuses.find((campus) => campus.id === building.campusId)?.name,
    building.name,
    building.code,
    ...floors.filter((floor) => floor.buildingId === building.id).map((floor) => `Level ${floor.level}`),
  ]);
  const shownCampuses = campuses.filter(
    (campus) => matchesSearch([campus.name], query) || shownBuildings.some((building) => building.campusId === campus.id),
  );
  return { campuses: shownCampuses, buildings: shownBuildings };
}

// "3 of 12 teachers": how many rows the search shows. Null while nothing is typed.
export function searchCount(shown: number, total: number, query: string, one: string, many: string): string | null {
  if (searchWords(query).length === 0) return null;
  return `${shown} of ${total} ${total === 1 ? one : many}`;
}

// 'No teacher matches "xyz".'
export function noMatchText(query: string, one: string): string {
  return `No ${one} matches "${query.trim()}".`;
}
