// Ask AirAware's fixed wording and pure helpers (Phase 7), tested without
// rendering. No advice copy lives here: answers are the server's cards.
import type {
  AskAnswer,
  AskTopic,
  HouseholdContext,
} from '../../../../shared/contracts.ts';
import {
  FIELDS,
  fieldId,
  toAnswers,
  type HouseholdField,
} from '../daily-plan/householdFields.ts';
import { verdictFrom } from '../today/today.ts';
import type { AskEntry } from './useAsk.ts';

export const TOPICS: Array<{ id: AskTopic; label: string }> = [
  { id: 'outdoors', label: 'Outdoor activities' },
  { id: 'windows', label: 'Windows and ventilation' },
  { id: 'indoor', label: 'Indoor air' },
  { id: 'family', label: 'My family' },
  { id: 'commuting', label: 'Commuting' },
  { id: 'habits', label: 'Better habits' },
];

export const STARTERS: Array<{ question: string; topic: AskTopic }> = [
  {
    question: 'What should I consider before a morning walk today?',
    topic: 'outdoors',
  },
  { question: 'When does it make sense to open my windows?', topic: 'windows' },
  { question: 'How can I improve my indoor air?', topic: 'indoor' },
  // Ask shows the first 4 (owner, 27 Nov: Ask UX spec §7); the 5th waits
  // under "More topics".
  {
    question: 'How can I reduce pollution while commuting?',
    topic: 'commuting',
  },
  {
    question: "What should I consider for my children's outdoor activities?",
    topic: 'family',
  },
];
export const SHOWN_STARTERS = 4;

export const ASK_COPY = {
  heading: 'Ask AirAware',
  inputLabel: 'Ask about your air, home or day',
  send: 'Send',
  thinking: 'AirAware is thinking…',
  medical:
    "I can't give medical advice. For health concerns, please talk to a doctor.",
  outOfScope:
    'I can help with outdoor plans, windows and ventilation, indoor air, family, commuting and better habits.',
  errorTitle: "We couldn't answer that",
  errorFallback: 'Something went wrong answering your question.',
  tryAgain: 'Try again',
  // Guided chat (spec 2026-11-21).
  intro:
    "Claude (Anthropic) reads your question and answers from AirAware's rules and today's forecast.",
  // Ask UX spec (owner, 27 Nov).
  welcome: 'How can I help you today?',
  moreTopics: 'More topics',
  placeholder: 'Ask about your air, home or daily routine…',
  conversation: 'Conversation',
  forecastUnavailable: 'forecast unavailable right now',
  assistant: 'AirAware',
  copy: 'Copy answer',
  copied: 'Copied',
  copyFailed: "Couldn't copy. Select the text to copy it instead.",
  followUpIntro: 'One question so I can be more specific:',
  followUpNote:
    'This changes your answers for this visit. To keep them, save in My Profile.',
  skip: 'Skip',
  skipped: 'Skipped. You can answer it in My Profile any time.',
  noted: "Noted. That doesn't change this answer.",
  // A reply to an answer to a question back names the cards shown above
  // that still apply, instead of repeating them (owner, 27 Nov).
  stillApplies: 'Also still applies (see above):',
  alsoAsk: 'You could also ask:',
  askedPrefix: 'You asked:',
  answeredPrefix: 'You answered:',
} as const;

// An answer's hidden heading prefix: it names the question (WCAG 2.4.6).
export function answerPrefix(question: string): string {
  return `Your answer to "${question}":`;
}

export function answeredLine(label: string): string {
  return `You answered: ${label}.`;
}

// "You could also ask:": starters for nearby topics, never the one just
// answered (no starter is about greener habits).
const NEXT: Record<AskTopic, AskTopic[]> = {
  outdoors: ['commuting', 'family', 'windows'],
  windows: ['indoor', 'outdoors'],
  indoor: ['windows', 'family'],
  family: ['outdoors', 'commuting'],
  commuting: ['outdoors', 'family'],
  habits: ['commuting', 'indoor'],
};

export function suggestionsFor(topic: AskTopic): typeof STARTERS {
  return NEXT[topic].flatMap((next) =>
    STARTERS.filter((s) => s.topic === next),
  );
}

// The question AirAware asks back, if any: only on the newest entry, when it
// is a finished topic answer whose question back is not yet answered or
// skipped. The first offered question still unanswered on screen, not
// skipped this visit, and known to My Profile.
export interface PendingFollowUp {
  entryId: number;
  field: HouseholdField;
  changes: string[];
}

export function pendingFollowUp(
  entries: AskEntry[],
  context: HouseholdContext,
  skipped: ReadonlySet<string>,
): PendingFollowUp | null {
  const last = entries.at(-1);
  const answer = last?.answer;
  if (!last || last.status !== 'ready' || last.followUp || !answer) {
    return null;
  }
  if (answer.topic === 'medical' || answer.topic === 'out_of_scope') {
    return null;
  }
  const answers = toAnswers(context);
  // Answers changed elsewhere since this reply (My Profile): its offers were
  // worked out against the old answers, so it asks nothing.
  const asked = toAnswers(last.request?.householdContext ?? {});
  if (JSON.stringify(answers) !== JSON.stringify(asked)) return null;
  // An older server (a rollback) sends none.
  for (const { field: id, changes } of answer.followUps ?? []) {
    const field = FIELDS.find((f) => fieldId(f) === id);
    // Never asked back, whatever a server sends: My Profile only.
    if (id === 'householdNeeds.mayBeMoreSensitive') continue;
    if (field && !answers[id] && !skipped.has(id)) {
      return { entryId: last.id, field, changes };
    }
  }
  return null;
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

// For each reply that updates an earlier one, the cards it may name as
// "still applies (see above)": only those a reply still in the thread shows
// above it (the thread keeps the newest 10). Each reply shows at most
// `perReply` cards, leaving out those named.
export function shownAbove(
  entries: AskEntry[],
  perReply = 3,
): Map<number, string[]> {
  const seen = new Set<string>();
  const result = new Map<number, string[]>();
  for (const entry of entries) {
    const named = (entry.shown ?? []).filter((id) => seen.has(id));
    result.set(entry.id, named);
    if (entry.status !== 'ready' || !entry.answer) continue;
    for (const card of entry.answer.cards
      .filter((c) => !named.includes(c.id))
      .slice(0, perReply))
      seen.add(card.id);
  }
  return result;
}

// What an answer's context lines say: who made it, the forecast and its time,
// the air level and the note. Two answers with the same key repeat them, so
// the later one leaves them out (owner, 27 Nov). Medical and out-of-scope
// replies have none.
export function contextKey(answer: AskAnswer): string | null {
  if (answer.topic === 'medical' || answer.topic === 'out_of_scope')
    return null;
  return [
    answer.generatedBy,
    answer.forecast?.retrievedAt ?? '',
    answer.air.level,
    answer.safetyNote,
  ].join('|');
}
