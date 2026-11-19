// Official observations stay visibly separate from the model forecast
// (PRD US-04). No CPCB feed is connected yet, so this always says so.
export function ObservationPanel({ note }: { note?: string }) {
  return (
    <section className="flex gap-3 rounded-lg border border-rule p-5 sm:p-6">
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="mt-0.5 size-5 flex-none fill-text-dark-muted"
      >
        <path d="M10 1a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 2a7 7 0 1 1 0 14 7 7 0 0 1 0-14ZM9 8h2v6H9zM9 5h2v2H9z" />
      </svg>
      <div className="flex flex-col gap-1">
        <h3 className="font-semibold">Official observation</h3>
        <p>Official CPCB observation unavailable</p>
        {note && <p className="text-sm text-text-dark-muted">{note}</p>}
      </div>
    </section>
  );
}
