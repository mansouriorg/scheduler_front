// What the home page shows after Generate: a short summary of what was placed, and
// the notes about when some of the new classes take place (on Saturday, before
// the lecture of their course, outside the time their teacher prefers).

// The answer of POST /scheduler/generate (the fields the page reads).
export type GenerateResult = {
  message?: string;
  summary?: string;
  notes?: unknown;
};

export type GenerateNotice = { text: string; notes: string[] };

export function generateNotice(result: GenerateResult): GenerateNotice {
  const notes = Array.isArray(result.notes)
    ? result.notes.filter(
        (note): note is string => typeof note === 'string' && note.trim() !== '',
      )
    : [];
  if (result.summary) {
    return { text: result.summary, notes };
  }
  // An answer without a summary (an older brain_server, or nothing to place):
  // its message, as it is.
  return { text: result.message || 'The timetable was generated.', notes: [] };
}
