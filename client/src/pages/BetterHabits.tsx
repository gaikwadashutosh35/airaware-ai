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

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Better Habits</h1>
      {guides.state.status === 'ready' ? (
        <GuideGroups set={guides.state.data} level={2} />
      ) : guides.state.status === 'error' ? (
        <ErrorState
          error={guides.state.error}
          onRetry={guides.retry}
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
