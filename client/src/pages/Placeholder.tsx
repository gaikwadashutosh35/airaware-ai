// Stands in for a page built in a later phase. Local only: never pushed.
// The shell sets the page title.
export function Placeholder({ title }: { title: string }) {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="text-text-dark-muted">
        This part of AirAware is on its way.
      </p>
    </>
  );
}
