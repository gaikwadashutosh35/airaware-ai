import type { HouseholdContext } from '../../../../shared/contracts.ts';

// The household questions (PRD §10): all optional, no medical wording.
// A yes/no question has three answers, because the rules treat "No"
// differently from "Not answered".
export interface HouseholdField {
  group: 'routine' | 'home' | 'householdNeeds';
  key: string;
  label: string;
  // Absent for yes/no questions.
  options?: Array<[value: string, label: string]>;
}

export const GROUPS: Array<[HouseholdField['group'], string]> = [
  ['routine', 'Your routine'],
  ['home', 'Your home'],
  ['householdNeeds', 'Who lives with you'],
];

export const FIELDS: HouseholdField[] = [
  {
    group: 'routine',
    key: 'commuteMode',
    label: 'How do you usually travel to work or college?',
    options: [
      ['walk', 'Walk'],
      ['cycle', 'Cycle'],
      ['two_wheeler', 'Two-wheeler'],
      ['car', 'Car'],
      ['public_transport', 'Public transport'],
      ['work_from_home', 'I work from home'],
    ],
  },
  {
    group: 'routine',
    key: 'outdoorExercise',
    label: 'Do you exercise outdoors?',
  },
  {
    group: 'routine',
    key: 'schoolCommute',
    label: 'Does a child in your home travel to school?',
  },
  {
    group: 'home',
    key: 'nearBusyRoad',
    label: 'Is your home near a busy road?',
    options: [
      ['yes', 'Yes'],
      ['no', 'No'],
      ['unknown', 'Not sure'],
    ],
  },
  {
    group: 'home',
    key: 'cookingFuel',
    label: 'What do you mostly cook with?',
    options: [
      ['lpg', 'LPG gas'],
      ['electric', 'Electric'],
      ['biomass', 'Wood or other biomass'],
      ['other', 'Other'],
      ['prefer_not_to_say', 'Prefer not to say'],
    ],
  },
  {
    group: 'home',
    key: 'kitchenExhaust',
    label: 'Does your kitchen have an exhaust fan or chimney?',
  },
  { group: 'home', key: 'airPurifier', label: 'Do you have an air purifier?' },
  {
    group: 'householdNeeds',
    key: 'includesChildren',
    label: 'Are there children in your home?',
  },
  {
    group: 'householdNeeds',
    key: 'includesOlderAdults',
    label: 'Are there older adults in your home?',
  },
  {
    group: 'householdNeeds',
    key: 'mayBeMoreSensitive',
    label: 'Might someone at home be more sensitive to air pollution?',
  },
];

// Form state: one string per field, keyed "group.key"; '' = not answered.
export type Answers = Record<string, string>;

export const fieldId = (field: HouseholdField) => `${field.group}.${field.key}`;

export function toAnswers(context: HouseholdContext): Answers {
  const groups = context as Record<string, Record<string, unknown> | undefined>;
  const answers: Answers = {};
  for (const field of FIELDS) {
    const value = groups[field.group]?.[field.key];
    answers[fieldId(field)] =
      typeof value === 'boolean'
        ? value
          ? 'yes'
          : 'no'
        : typeof value === 'string'
          ? value
          : '';
  }
  return answers;
}

// Only answered questions are sent; empty groups are left out.
export function toContext(answers: Answers): HouseholdContext {
  const context: Record<string, Record<string, string | boolean>> = {};
  for (const field of FIELDS) {
    const value = answers[fieldId(field)];
    if (!value) continue;
    (context[field.group] ??= {})[field.key] = field.options
      ? value
      : value === 'yes';
  }
  return context as HouseholdContext;
}
