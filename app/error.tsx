'use client';

import { useEffect } from 'react';

type PageErrorProps = {
  error: Error & { digest?: string };
  reset?: () => void;
};

// Next.js shows this when a page fails while it is being displayed.
// The sidebar stays usable; "Try again" displays the page once more.
export default function PageError({ error, reset }: PageErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl p-8">
      <div role="alert" className="rounded-xl border border-red-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">This page could not be shown</h1>
        <p className="mt-2 text-sm text-gray-600">
          Something went wrong while displaying this page. Try again, or open another page from the
          menu.
        </p>
        {reset && (
          <button
            type="button"
            onClick={reset}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
