import { useId } from 'react';
import type { SourceInfo } from '../../../../shared/contracts.ts';
import { LIMITATIONS } from './limitations.ts';

export function SourcesPanel({
  sources,
  forecastLimitations,
}: {
  // null while loading or after a failure: the limitations still show.
  sources: SourceInfo[] | null;
  forecastLimitations: string[];
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <h2 id={headingId} className="text-2xl font-semibold tracking-tight">
        Sources and limitations
      </h2>
      {sources && (
        <div className="flex flex-col gap-2">
          <h3 className="font-semibold">Sources</h3>
          <ul className="flex flex-col gap-3 text-sm">
            {sources.map((source) => (
              <li key={source.id} className="flex flex-col gap-1">
                <a href={source.url} className="underline">
                  {source.name}
                </a>
                <span>
                  {source.status === 'available'
                    ? 'Connected'
                    : 'Not connected'}
                </span>
                {source.licence && <span>Licence: {source.licence}</span>}
                {source.attribution && <span>{source.attribution}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <h3 className="font-semibold">Limitations</h3>
        <ul className="list-disc pl-5 text-sm">
          {[...LIMITATIONS, ...forecastLimitations].map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
