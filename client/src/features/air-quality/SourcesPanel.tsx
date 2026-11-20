import { useId } from 'react';
import type { SourceInfo } from '../../../../shared/contracts.ts';
import { mergedLimitations } from '../today/today.ts';

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
      <h3 id={headingId} className="text-xl font-semibold">
        Sources and limitations
      </h3>
      {sources && (
        <div className="flex flex-col gap-2">
          <h4 className="font-semibold">Sources</h4>
          <ul className="flex flex-col gap-3 text-sm">
            {sources.map((source) => (
              <li key={source.id} className="flex flex-col gap-1">
                <a
                  href={source.url}
                  className="inline-flex min-h-11 items-center underline"
                >
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
        <h4 className="font-semibold">Limitations</h4>
        <ul className="list-disc pl-5 text-sm">
          {mergedLimitations(forecastLimitations).map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
