'use client';

import { useEffect, useId, useRef } from 'react';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  // While true, both buttons are disabled (for example while the delete runs).
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

// An "are you sure?" window for actions that cannot be undone, such as deleting.
// It uses the browser's <dialog> element: the rest of the page cannot be clicked
// while it is open, keyboard focus stays inside, and Escape cancels.
// Focus starts on Cancel, the safe choice. Each window has its own ids, so that
// a page can have more than one.
export function ConfirmDialog({ open, title, message, confirmLabel, busy = false, onConfirm, onCancel }: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    if (open && dialog.open === false) {
      dialog.showModal();
      cancelRef.current?.focus();
    } else if (open === false && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onCancel={(event) => {
        // Escape: the page closes the dialog itself (through `open`), unless busy.
        event.preventDefault();
        if (busy === false) onCancel();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-gray-200 bg-white p-6 text-left shadow-xl backdrop:bg-gray-900/50"
    >
      <h2 id={titleId} className="text-lg font-semibold text-gray-900">
        {title}
      </h2>
      <p id={messageId} className="mt-2 text-sm text-gray-600">
        {message}
      </p>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          ref={cancelRef}
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-lg border border-gray-500 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
