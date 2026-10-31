type StatusProps = {
  message: string;
  tone?: 'loading' | 'error';
  onRetry?: () => void;
};

function StatusContent({ message, tone = 'loading', onRetry }: StatusProps) {
  if (tone === 'error') {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 text-red-700">
        <p>{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg border border-red-300 bg-white px-3 py-1.5 font-medium text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            Try again
          </button>
        )}
      </div>
    );
  }
  return (
    <p role="status" className="flex items-center justify-center gap-2 text-gray-600">
      <span
        aria-hidden="true"
        className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-blue-600 motion-safe:animate-spin"
      />
      {message}
    </p>
  );
}

// A table row across all columns that says the data is loading, or could not load.
export function StatusRow({ colSpan, ...props }: StatusProps & { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-8 text-center text-sm">
        <StatusContent {...props} />
      </td>
    </tr>
  );
}

// The same message for places that are not tables.
export function StatusBlock(props: StatusProps) {
  return (
    <div className="p-8 text-center text-sm">
      <StatusContent {...props} />
    </div>
  );
}
