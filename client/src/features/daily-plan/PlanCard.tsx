import type { DailyPlan } from '../../../../shared/contracts.ts';
import { basedOn, inputLabel, PERIODS, type PlanItem } from './planDisplay.ts';

const NO_SOURCE = 'No external source; this is general guidance.';

// One suggestion. A notice keeps its caveat in view; a compact card is a
// repeat of a "Your day" item and says where the full card is.
export function PlanCard({
  item,
  sources,
  level,
  notice = false,
  openWhy = false,
  snapshot = false,
  flat = false,
}: {
  item: PlanItem;
  sources: DailyPlan['sources'];
  level: 3 | 4 | 5;
  notice?: boolean;
  // Start with "Why?" open (the landing page's see-why example).
  openWhy?: boolean;
  // A saved plan: "that day", never "today".
  snapshot?: boolean;
  // No box: a top rule only, for a card inside a surface that is already one.
  flat?: boolean;
}) {
  const { candidate, forYou, period, compact } = item;
  const Heading = (['h3', 'h4', 'h5'] as const)[level - 3];
  const cited = sources.filter((source) =>
    candidate.sourceIds.includes(source.id),
  );

  return (
    <article
      className={
        flat
          ? 'flex flex-col gap-2 border-t border-rule pt-3'
          : 'flex flex-col gap-2 rounded-lg border border-rule p-4'
      }
    >
      <Heading className="font-semibold">{candidate.title}</Heading>
      {compact ? (
        <p className="text-sm text-text-dark-muted">
          In your day: {PERIODS.find(([p]) => p === period)?.[1] ?? period}
        </p>
      ) : (
        <>
          {candidate.priority === 'high' && (
            <p className="text-sm font-semibold">
              {snapshot ? 'Important that day' : 'Important today'}
            </p>
          )}
          <p>{candidate.text}</p>
          {forYou && (
            <p>
              <span className="font-medium">For you: </span>
              {forYou}
            </p>
          )}
          {notice && candidate.caveat && (
            <p className="text-sm">{candidate.caveat}</p>
          )}
          <details open={openWhy}>
            <summary className="min-h-11 cursor-pointer py-2 font-medium">
              Why?
              <span className="sr-only"> ({candidate.title})</span>
            </summary>
            <dl className="flex flex-col gap-2 text-sm">
              <div>
                <dt className="font-medium">Reason</dt>
                <dd>{candidate.reason}</dd>
              </div>
              <div>
                <dt className="font-medium">Based on</dt>
                <dd>{basedOn(candidate.evidenceType, snapshot)}</dd>
              </div>
              {candidate.inputsUsed.length > 0 && (
                <div>
                  <dt className="font-medium">What it used</dt>
                  <dd>
                    <ul className="list-disc pl-5">
                      {candidate.inputsUsed.map((path) => (
                        <li key={path}>{inputLabel(path)}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              )}
              <div>
                <dt className="font-medium">Sources</dt>
                <dd>
                  {cited.length ? (
                    <ul className="list-disc pl-5">
                      {cited.map((source) => (
                        <li key={source.id}>
                          <a
                            href={source.url}
                            className="inline-flex min-h-11 items-center underline"
                          >
                            {source.name}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    NO_SOURCE
                  )}
                </dd>
              </div>
              {!notice && candidate.caveat && (
                <div>
                  <dt className="font-medium">Caveat</dt>
                  <dd>{candidate.caveat}</dd>
                </div>
              )}
            </dl>
          </details>
        </>
      )}
    </article>
  );
}
