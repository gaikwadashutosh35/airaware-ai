import { useRef } from 'react';
import { ErrorState, Loading } from '../components/States.tsx';
import { useRequest } from '../features/air-quality/useRequest.ts';
import { GuideGroups } from '../features/guides/GuideGroups.tsx';
import { getGuides } from '../services/api.ts';

// Better Habits (spec §7.6): the guide library's habit groups. Qualitative
// only: no emission-savings figures.
export function BetterHabits() {
  const guides = useRequest('guides:habits', (signal) =>
    getGuides('habits', signal),
  );
  const headingRef = useRef<HTMLHeadingElement>(null);

  return (
    <>
      <div data-part="title-block" className="flex flex-col gap-2">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-3xl font-semibold tracking-tight"
        >
          Better Habits
        </h1>
        <p className="max-w-prose text-sm text-text-dark">
          Practical habits that cut pollution for you and your neighbours. We
          never show an emissions saving we can&apos;t calculate.
        </p>
      </div>
      {guides.state.status === 'ready' ? (
        <div className="rounded-lg border border-rule card-surface p-5 sm:p-6">
          <GuideGroups set={guides.state.data} level={2} />
        </div>
      ) : guides.state.status === 'error' ? (
        <ErrorState
          error={guides.state.error}
          onRetry={() => {
            guides.retry();
            // The button goes with the card: keep focus on the page.
            headingRef.current?.focus();
          }}
          title="We couldn't load the guides"
          fallback="Something went wrong loading the guides."
          level={2}
        />
      ) : (
        <Loading
          label="Loading guides"
          className="min-h-[132.4rem] min-[360px]:min-h-[120rem] min-[390px]:min-h-[114.1rem] sm:min-h-[92.4rem] md:min-h-[77.5rem] lg:min-h-[66.2rem] min-[68.125rem]:min-h-[43.2rem]"
        />
      )}
    </>
  );
}
