import type { HouseholdContext, SavedPlan } from '../../../shared/contracts.ts';
import { HouseholdPreferencesForm } from '../features/daily-plan/HouseholdPreferencesForm.tsx';
import { SavedPlansList } from '../features/daily-plan/SavedPlansList.tsx';

// My Profile: the household answers and saved plans, moved from Today. The
// shell keeps the answers, so they survive leaving this page unsaved.
export function Profile({
  context,
  onContextChange,
  onDeleted,
  listVersion,
  onOpen,
  onPlanDeleted,
}: {
  context: HouseholdContext;
  onContextChange: (context: HouseholdContext) => void;
  onDeleted: () => void;
  listVersion: number;
  onOpen: (plan: SavedPlan) => void;
  onPlanDeleted: (id: string) => void;
}) {
  return (
    <>
      <title>My Profile | AirAware AI</title>
      <h1 className="text-3xl font-semibold tracking-tight">My Profile</h1>
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <HouseholdPreferencesForm
          initial={context}
          onChange={onContextChange}
          onDeleted={onDeleted}
        />
        <SavedPlansList
          version={listVersion}
          onOpen={onOpen}
          onDeleted={onPlanDeleted}
        />
      </div>
    </>
  );
}
