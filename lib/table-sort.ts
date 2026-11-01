// Sorting the tables (Classrooms, Teachers, Cohorts, Courses, Academic Terms): a click
// on a column heading sorts the rows by that column, a second click reverses the
// order. Where a table is shown as cards, a "Sort by" list does the same.

export type SortKind = 'text' | 'number' | 'date';
export type SortValue = string | number | null | undefined;

// A column that can be sorted: its key, its heading, the kind of its values, and the
// value of a row in it (a date as brain_server sends it, "2026-09-14T00:00:00.000Z").
export type SortColumn<T> = { key: string; label: string; kind: SortKind; value: (row: T) => SortValue };

// The order chosen: a column, A to Z (or lowest or earliest first) unless descending.
// null: the order in which brain_server sends the rows.
export type Sort = { key: string; descending: boolean } | null;

// After a click on a column heading: the same column the other way round, or a new
// column A to Z.
export function nextSort(sort: Sort, key: string): Sort {
  if (sort !== null && sort.key === key) return { key, descending: sort.descending === false };
  return { key, descending: false };
}

const isEmpty = (value: SortValue) => value === null || value === undefined || value === '';

function compare(a: SortValue, b: SortValue, kind: SortKind): number {
  if (kind === 'number') return Number(a) - Number(b);
  if (kind === 'date') return Date.parse(String(a)) - Date.parse(String(b));
  // "Lab 2" before "Lab 10", and capitals and accents do not change the order.
  return String(a).localeCompare(String(b), 'en', { numeric: true, sensitivity: 'base' });
}

// The rows in the chosen order: empty values last either way, and rows with the same
// value in the order they came in.
export function sortRows<T>(rows: T[], columns: SortColumn<T>[], sort: Sort): T[] {
  if (sort === null) return rows;
  const column = columns.find((candidate) => candidate.key === sort.key);
  if (column === undefined) return rows;
  const descending = sort.descending;
  return rows
    .map((row, index) => ({ row, index, value: column.value(row) }))
    .sort((a, b) => {
      const empty = Number(isEmpty(a.value)) - Number(isEmpty(b.value));
      if (empty !== 0) return empty;
      const order = isEmpty(a.value) ? 0 : compare(a.value, b.value, column.kind) || 0;
      return (descending ? -order : order) || a.index - b.index;
    })
    .map((item) => item.row);
}

const DIRECTIONS: Record<SortKind, [string, string]> = {
  text: ['A to Z', 'Z to A'],
  number: ['lowest first', 'highest first'],
  date: ['earliest first', 'latest first'],
};

// "A to Z", "highest first", "earliest first".
export function directionText(kind: SortKind, descending: boolean): string {
  return DIRECTIONS[kind][descending ? 1 : 0];
}

// "Sorted by Max Hours, highest first", under the title of the table. Null in the
// order of brain_server.
export function sortText<T>(columns: SortColumn<T>[], sort: Sort): string | null {
  if (sort === null) return null;
  const column = columns.find((candidate) => candidate.key === sort.key);
  return column === undefined ? null : `Sorted by ${column.label}, ${directionText(column.kind, sort.descending)}`;
}

// The aria-sort of a column heading: only the column the table is sorted by has one.
export function ariaSort(sort: Sort, key: string): 'ascending' | 'descending' | undefined {
  if (sort === null || sort.key !== key) return undefined;
  return sort.descending ? 'descending' : 'ascending';
}

// The value of the "Sort by" list for an order: "name:asc", "capacity:desc", '' for
// the order of brain_server.
export function sortChoice(sort: Sort): string {
  return sort === null ? '' : `${sort.key}:${sort.descending ? 'desc' : 'asc'}`;
}

// The order of a value of the "Sort by" list.
export function sortFromChoice(value: string): Sort {
  const at = value.lastIndexOf(':');
  if (at <= 0) return null;
  return { key: value.slice(0, at), descending: value.slice(at + 1) === 'desc' };
}

// The choices of the "Sort by" list: each column both ways ("Capacity, highest first").
export function sortChoices<T>(columns: SortColumn<T>[]): { value: string; label: string }[] {
  return columns.flatMap((column) =>
    [false, true].map((descending) => ({
      value: sortChoice({ key: column.key, descending }),
      label: `${column.label}, ${directionText(column.kind, descending)}`,
    })),
  );
}
