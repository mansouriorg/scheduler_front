// The term and the View (every class, or one cohort, teacher or room) chosen last on
// the home page, kept in this browser (localStorage), so that a reload or the next
// visit shows the same week. Only this browser keeps it, and only these two values.

// The term and the View list value ("All", "cohort:SE - Year 1", "teacher:...").
export type HomeChoice = { termId: string; view: string };

// The key under which the browser keeps the choice.
export const HOME_CHOICE_KEY = 'university-scheduler:home-choice';

type ChoiceStorage = { getItem(key: string): string | null; setItem(key: string, value: string): void };

// The storage of this browser, or null where there is none (on the server while the
// page is built, or where the browser blocks it).
export function browserStorage(): ChoiceStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

// The choice kept in the storage, or null when there is none or it cannot be read.
export function readHomeChoice(storage: ChoiceStorage | null): HomeChoice | null {
  try {
    const text = storage?.getItem(HOME_CHOICE_KEY);
    if (typeof text !== 'string') return null;
    const value: unknown = JSON.parse(text);
    if (typeof value !== 'object' || value === null) return null;
    const { termId, view } = value as Record<string, unknown>;
    return typeof termId === 'string' && typeof view === 'string' ? { termId, view } : null;
  } catch {
    return null;
  }
}

// Keeps the choice in the storage. Nothing happens where the browser does not let the
// page keep it: the page works the same, it only does not remember.
export function saveHomeChoice(storage: ChoiceStorage | null, choice: HomeChoice): void {
  try {
    storage?.setItem(HOME_CHOICE_KEY, JSON.stringify(choice));
  } catch {
    // Storage full or blocked: nothing to do.
  }
}

// The term and View to start with: the ones kept, while that term still exists;
// otherwise the fallback (the term going on today, every class).
export function startChoice(termIds: string[], saved: HomeChoice | null, fallback: HomeChoice): HomeChoice {
  return saved !== null && termIds.includes(saved.termId) ? saved : fallback;
}
