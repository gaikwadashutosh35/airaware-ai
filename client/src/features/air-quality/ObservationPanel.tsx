// Official observations stay visibly separate from the model forecast
// (PRD US-04). No CPCB feed is connected yet, so this always says so.
export function ObservationPanel({ note }: { note?: string }) {
  return (
    <section className="flex flex-col gap-1 rounded-md border border-dashed border-text-dark p-4">
      <h3 className="font-semibold">Official observation</h3>
      <p>Official CPCB observation unavailable</p>
      {note && <p className="text-sm">{note}</p>}
    </section>
  );
}
