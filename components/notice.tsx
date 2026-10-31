'use client';

import { useEffect } from 'react';

export type NoticeMessage = { type: 'success' | 'error'; text: string };

type NoticeProps = {
  message: NoticeMessage | null;
  // Pass the state setter of the message, for example onDismiss={setNotice}.
  onDismiss: (value: null) => void;
};

// A short message in the bottom-right corner after a save.
// Success messages close by themselves after 5 seconds; errors stay until closed.
export function Notice({ message, onDismiss }: NoticeProps) {
  useEffect(() => {
    if (message?.type !== 'success') return;
    const timer = setTimeout(() => onDismiss(null), 5000);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  const colors =
    message?.type === 'error'
      ? 'border-red-200 bg-red-50 text-red-800'
      : 'border-green-200 bg-green-50 text-green-800';

  return (
    <div aria-live="polite" className="fixed bottom-4 right-4 z-50 w-[calc(100%-2rem)] max-w-sm">
      {message && (
        <div
          role={message.type === 'error' ? 'alert' : 'status'}
          className={`flex items-start gap-3 rounded-lg border p-4 shadow-lg ${colors}`}
        >
          <p className="flex-1 text-sm">{message.text}</p>
          <button
            type="button"
            onClick={() => onDismiss(null)}
            aria-label="Close message"
            className="-m-1 rounded p-1 text-lg leading-none opacity-80 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
}
