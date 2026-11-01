'use client';

import type { ReactNode } from 'react';
import { Search } from 'lucide-react';

type SearchBarProps = {
  title: string;
  // The id of the search box. Its count line gets the id INPUTID-count.
  inputId: string;
  // The name of the box for screen readers ("Search teachers"), and what can be
  // searched, shown in the empty box ("Name or department").
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  // "3 of 12 teachers" (see searchCount in lib/table-search.ts), or null while
  // nothing is typed.
  count: string | null;
  // Shown next to the title, for example how many cohorts there are (optional).
  badge?: ReactNode;
  // How the rows are sorted ("Sorted by Name, A to Z", see sortText in
  // lib/table-sort.ts), said after the count; null in the order of brain_server.
  sorted?: string | null;
};

// The bar above a table: its title, a search box that keeps the rows that have
// what is typed (see lib/table-search.ts), and how many rows the search shows,
// which screen readers announce. Escape empties the box.
export function TableSearchBar({ title, inputId, label, placeholder, value, onChange, count, badge, sorted }: SearchBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-gray-100 bg-gray-50/50 px-6 py-5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          {badge}
        </div>
        <p id={`${inputId}-count`} role="status" className="text-sm text-gray-600">
          {[count, sorted].filter((part) => part).join('. ')}
        </p>
      </div>
      <div className="relative w-full sm:w-64">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
        />
        <input
          id={inputId}
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && value !== '') {
              event.preventDefault();
              onChange('');
            }
          }}
          aria-label={label}
          aria-describedby={`${inputId}-count`}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-lg border border-gray-500 bg-white py-2 pl-9 pr-3 text-base text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-blue-600 sm:text-sm"
        />
      </div>
    </div>
  );
}

type NoMatchProps = {
  // 'No teacher matches "xyz".' (see noMatchText in lib/table-search.ts)
  text: string;
  // The id of the search box, which gets the cursor back after Clear search.
  inputId: string;
  onClear: () => void;
};

function NoMatchContent({ text, inputId, onClear }: NoMatchProps) {
  return (
    <div className="flex flex-col items-center gap-3 text-gray-600">
      <p>{text}</p>
      <button
        type="button"
        onClick={() => {
          onClear();
          document.getElementById(inputId)?.focus();
        }}
        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        Clear search
      </button>
    </div>
  );
}

// A table row across all columns that says no row has what is typed, with a
// button that empties the search box.
export function NoMatchRow({ colSpan, ...props }: NoMatchProps & { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-8 text-center text-sm">
        <NoMatchContent {...props} />
      </td>
    </tr>
  );
}

// The same message for lists that are not tables.
export function NoMatchBlock(props: NoMatchProps) {
  return (
    <div className="p-8 text-center text-sm">
      <NoMatchContent {...props} />
    </div>
  );
}
