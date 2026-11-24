import { ChevronDown, MapPin } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import { LocationSearch } from '../features/location/LocationSearch.tsx';
import type { Place } from '../features/location/place.ts';
import { UseMyLocation } from '../features/location/UseMyLocation.tsx';

// The place, always one tap away. A native modal dialog gives focus
// containment, Escape and focus return; its content mounts only while open,
// so a closed dialog never holds a second search box.
export function PlaceChip({
  label,
  open,
  onOpenChange,
  onChoose,
  onLocateStart,
  onLocate,
}: {
  label?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChoose: (place: Place) => void;
  onLocateStart: () => void;
  onLocate: (place: Place) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={label ? `Change place: ${label}` : 'Choose a place'}
        onClick={() => onOpenChange(true)}
        className="ml-auto flex min-h-11 min-w-0 max-w-fit grow basis-0 items-center gap-1.5 rounded-full border border-text-muted px-3 text-sm md:ml-0"
      >
        <MapPin aria-hidden="true" className="size-4 flex-none" />
        {/* Below lg only the text before the first comma shows. */}
        <span className="max-w-[6.625rem] truncate md:max-w-[9.625rem] lg:hidden">
          {label ? label.split(',')[0] : 'Choose a place'}
        </span>
        <span className="hidden max-w-[6.625rem] truncate md:max-w-[9.625rem] lg:inline">
          {label ?? 'Choose a place'}
        </span>
        <ChevronDown aria-hidden="true" className="size-4 flex-none" />
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={() => onOpenChange(false)}
        // Click outside also closes, where supported (Escape always does).
        {...({ closedby: 'any' } as object)}
        className="on-light m-auto w-[min(32rem,calc(100%-2rem))] rounded-xl bg-surface-light p-5 text-text-dark backdrop:bg-bg/60 sm:p-6"
      >
        {open && (
          <div className="flex flex-col gap-4">
            <h2 id={titleId} className="text-xl font-semibold">
              Change place
            </h2>
            <LocationSearch onSelect={onChoose} />
            <UseMyLocation onLocateStart={onLocateStart} onLocate={onLocate} />
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="min-h-11 self-start rounded-md border border-text-dark px-4"
            >
              Close
            </button>
          </div>
        )}
      </dialog>
    </>
  );
}
