import Link from 'next/link';

// Next.js shows this for any address that matches no page.
export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl p-8">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-gray-600">Error 404</p>
        <h1 className="mt-1 text-xl font-semibold text-gray-900">Page not found</h1>
        <p className="mt-2 text-sm text-gray-600">
          This address does not match any page. Use the menu, or go back to the timetable.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Go to the timetable
        </Link>
      </div>
    </div>
  );
}
