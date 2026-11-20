// Ask AirAware's fixed wording and pure helpers (Phase 7), tested without
// rendering. No advice copy lives here: answers are the server's cards.
import type {
  AskAnswer,
  AskTopic,
  HouseholdContext,
} from '../../../../shared/contracts.ts';
import { toAnswers } from '../daily-plan/householdFields.ts';
import { verdictFrom } from '../today/today.ts';

export const TOPICS: Array<{ id: AskTopic; label: string }> = [
  { id: 'outdoors', label: 'Outdoor activities' },
  { id: 'windows', label: 'Windows and ventilation' },
  { id: 'indoor', label: 'Indoor air' },
  { id: 'family', label: 'My family' },
  { id: 'commuting', label: 'Commuting' },
  { id: 'habits', label: 'Greener habits' },
];

export const STARTERS: Array<{ question: string; topic: AskTopic }> = [
  { question: 'Can I go for a morning walk today?', topic: 'outdoors' },
  { question: 'Is it a good idea to open my windows?', topic: 'windows' },
  { question: 'How can I improve my indoor air?', topic: 'indoor' },
  {
    question: "What should I consider for my children's outdoor activities?",
    topic: 'family',
  },
  {
    question: 'How can I reduce pollution while commuting?',
    topic: 'commuting',
  },
];

export const ASK_COPY = {
  heading: 'Ask AirAware',
  inputLabel: 'Ask about your air, home or day',
  send: 'Send',
  thinking: 'AirAware is thinking…',
  medical:
    "I can't give medical advice. For health concerns, please talk to a doctor.",
  outOfScope:
    'I can help with outdoor plans, windows and ventilation, indoor air, family and greener habits',
  errorTitle: "We couldn't answer that",
  errorFallback: 'Something went wrong answering your question.',
  tryAgain: 'Try again',
} as const;

// The current topic's starters first, the rest in their usual order.
export function startersFor(topic: AskTopic | null): typeof STARTERS {
  return [
    ...STARTERS.filter((s) => s.topic === topic),
    ...STARTERS.filter((s) => s.topic !== topic),
  ];
}

// Household questions answered, out of 10; "No" and "Not sure" count.
export function answeredCount(context: HouseholdContext): number {
  return Object.values(toAnswers(context)).filter(Boolean).length;
}

// "8:15 AM": a forecast's retrieval time, as Today shows it.
export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

// The AI summary, else the verdict's approved explanation (no new copy).
export function shortAnswer(answer: AskAnswer): string {
  return answer.summary ?? verdictFrom(answer.air).explanation;
}
