import type { SourceInfo } from '../../../../shared/contracts.ts';

export function SourcesPanel({ sources }: { sources: SourceInfo[] }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-semibold">Sources</h3>
      <ul className="flex flex-col gap-3 text-sm">
        {sources.map((source) => (
          <li key={source.id} className="flex flex-col gap-1">
            <a href={source.url} className="underline">
              {source.name}
            </a>
            <span>
              {source.status === 'available' ? 'Connected' : 'Not connected'}
            </span>
            {source.licence && <span>Licence: {source.licence}</span>}
            {source.attribution && <span>{source.attribution}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
