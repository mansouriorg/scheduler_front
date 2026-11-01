'use client';

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import {
  ariaSort,
  nextSort,
  sortChoice,
  sortChoices,
  sortFromChoice,
  type Sort,
  type SortColumn,
} from '@/lib/table-sort';

type SortHeaderProps<T> = {
  // The columns of the table that can be sorted, and the key of this one.
  columns: SortColumn<T>[];
  columnKey: string;
  sort: Sort;
  onSort: (sort: Sort) => void;
};

// A column heading that sorts the table: a click (or Enter or Space) sorts the rows by
// this column, a second one reverses the order. The arrow shows the order, and screen
// readers hear it on the heading (aria-sort) and in the line under the table title.
export function SortHeader<T>({ columns, columnKey, sort, onSort }: SortHeaderProps<T>) {
  const column = columns.find((candidate) => candidate.key === columnKey);
  const direction = ariaSort(sort, columnKey);
  const Arrow = direction === 'ascending' ? ArrowUp : direction === 'descending' ? ArrowDown : ArrowUpDown;
  return (
    <th aria-sort={direction} className="p-4 font-medium">
      <button
        type="button"
        onClick={() => onSort(nextSort(sort, columnKey))}
        className="-mx-1 inline-flex items-center gap-1 rounded px-1 uppercase tracking-wider hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        {column?.label ?? columnKey}
        <Arrow aria-hidden="true" className={`h-3.5 w-3.5 ${direction ? 'text-gray-900' : 'text-gray-500'}`} />
      </button>
    </th>
  );
}

type SortSelectProps<T> = {
  id: string;
  columns: SortColumn<T>[];
  sort: Sort;
  onSort: (sort: Sort) => void;
  // Where the table is shown, the list is hidden (cards.sort in lib/table-cards.ts).
  className: string;
};

// The same choice where the table is shown as cards, which have no column headings:
// a "Sort by" list above the cards.
export function SortSelect<T>({ id, columns, sort, onSort, className }: SortSelectProps<T>) {
  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        Sort by
      </label>
      <select
        id={id}
        value={sortChoice(sort)}
        onChange={(event) => onSort(sortFromChoice(event.target.value))}
        className="min-w-0 flex-1 rounded-lg border border-gray-500 bg-white px-3 py-2 text-base text-gray-900 shadow-sm focus:border-blue-600 sm:text-sm"
      >
        <option value="">Default order</option>
        {sortChoices(columns).map((choice) => (
          <option key={choice.value} value={choice.value}>
            {choice.label}
          </option>
        ))}
      </select>
    </div>
  );
}
