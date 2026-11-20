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
      <h1
        data-part="title-block"
        ref={headingRef}
        tabIndex={-1}
        className="text-3xl font-semibold tracking-tight"
      >
        Better Habits
      </h1>
      {guides.state.status === 'ready' ? (
        <div className="rounded-lg border border-rule bg-surface-light p-5 sm:p-6">
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
        <Loading label="Loading guides" />
      )}
    </>
  );
}
