// Stands in for a page built in a later phase. Local only: never pushed.
export function Placeholder({ title }: { title: string }) {
  return (
    <>
      <title>{`${title} | AirAware AI`}</title>
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="text-text-dark-muted">
        This part of AirAware is on its way.
      </p>
    </>
  );
}
