import type { AskTopic } from '../../../../shared/contracts.ts';

// The only code that reads an Ask question (spec §9.4). It is pure: it
// builds no RegExp from the input, remembers nothing, throws nothing and
// logs nothing. Medical words win over every topic (owner decision 3).

// Stems match the start of a word ("cough" matches "coughing"); whole words
// match only themselves; phrases match whole words in order, the last one
// also with a plural "s".
interface Words {
  stems?: string[];
  whole?: string[];
  phrases?: string[];
}

const MEDICAL: Words = {
  stems: [
    'asthma',
    'inhaler',
    'nebuli',
    'bronch',
    'pneumon',
    'allerg',
    'cough',
    'wheez',
    'breathless',
    'fever',
    'illness',
    'disease',
    'symptom',
    'diagnos',
    'medic',
    'prescri',
    'treatment',
    'doctor',
    'hospital',
    'pregnan',
    'steroid',
    'antibiotic',
    'dawa',
    'khansi',
    'bimar',
    'bukhar',
  ],
  whole: [
    'copd',
    'pill',
    'pills',
    'tablet',
    'tablets',
    'dose',
    'doses',
    'cure',
    'cures',
    'lung',
    'lungs',
    'saans',
  ],
  phrases: [
    'short of breath',
    'chest pain',
    'heart condition',
    'heart disease',
    'blood pressure',
  ],
};

// In precedence order: the first topic with a match answers.
const TOPICS: ReadonlyArray<readonly [AskTopic, Words]> = [
  [
    'family',
    {
      stems: [
        'child',
        'kid',
        'daughter',
        'baby',
        'babies',
        'toddler',
        'school',
        'elder',
        'grandparent',
        'grandmother',
        'grandfather',
        'parent',
        'famil',
      ],
      whole: ['son', 'sons', 'older'],
    },
  ],
  [
    'windows',
    {
      stems: ['window', 'ventilat'],
      whole: ['airing'],
      phrases: ['fresh air', 'air out'],
    },
  ],
  [
    'commuting',
    {
      stems: [
        'commut',
        'travel',
        'traffic',
        'driv',
        'cycl',
        'scooter',
        'metro',
        'office',
        'route',
      ],
      whole: ['car', 'cars', 'bike', 'bikes', 'bus', 'buses', 'auto', 'train'],
      phrases: ['two wheeler'],
    },
  ],
  [
    'indoor',
    {
      stems: [
        'indoor',
        'inside',
        'kitchen',
        'cook',
        'purif',
        'dust',
        'cleaning',
        'mop',
        'sweep',
        'smok',
        'incense',
        'candle',
      ],
      whole: ['home', 'house', 'room', 'rooms'],
      phrases: ['mosquito coil'],
    },
  ],
  [
    'habits',
    {
      stems: [
        'habit',
        'swap',
        'burn',
        'waste',
        'garbage',
        'rubbish',
        'energy',
        'electric',
        'applianc',
        'idl',
        'green',
        'eco',
        'carbon',
        'footprint',
        'recycl',
      ],
      whole: ['ac', 'fan', 'fans', 'leaves'],
    },
  ],
  [
    'outdoors',
    {
      stems: [
        'walk',
        'jog',
        'exercis',
        'outdoor',
        'outside',
        'park',
        'play',
        'sport',
        'cricket',
        'morning',
      ],
      whole: ['run', 'runs', 'running'],
    },
  ],
];

// General air questions ("How is the air today?") go to Outdoor activities.
const GENERAL_AIR: Words = {
  stems: ['pollut', 'smog', 'haze', 'forecast'],
  whole: ['air', 'aqi'],
  phrases: ['air quality'],
};

function wordsOf(question: string): string[] {
  return question
    .normalize('NFKC')
    .toLowerCase()
    .replace(/['’]/g, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

function matches(words: string[], list: Words): boolean {
  if (list.whole?.some((w) => words.includes(w))) return true;
  if (list.stems?.some((s) => words.some((w) => w.startsWith(s)))) return true;
  const joined = ` ${words.join(' ')} `;
  return (
    list.phrases?.some(
      (p) => joined.includes(` ${p} `) || joined.includes(` ${p}s `),
    ) ?? false
  );
}

export function classify(
  question: string,
): AskTopic | 'medical' | 'out_of_scope' {
  const words = wordsOf(question);
  if (matches(words, MEDICAL)) return 'medical';
  for (const [topic, list] of TOPICS) {
    if (matches(words, list)) return topic;
  }
  return matches(words, GENERAL_AIR) ? 'outdoors' : 'out_of_scope';
}
