import { Footprints, House, Leaf, Users, type LucideIcon } from 'lucide-react';
import type { AskTopic } from '../../../../shared/contracts.ts';

export type Topic = Extract<AskTopic, 'outdoors' | 'family'>;

// The four help choices: Today's links and the landing page's plain list.
export const CHOICES: Array<{
  title: string;
  line: string;
  to: string;
  topic?: Topic;
  Icon: LucideIcon;
}> = [
  {
    title: 'Outdoor activities',
    line: 'Walks, exercise, commutes',
    to: '/app/ask',
    topic: 'outdoors',
    Icon: Footprints,
  },
  {
    title: 'My home',
    line: 'Cooking, windows, purifiers',
    to: '/app/home',
    Icon: House,
  },
  {
    title: 'My family',
    line: 'Children, older adults, school runs',
    to: '/app/ask',
    topic: 'family',
    Icon: Users,
  },
  {
    title: 'Better habits',
    line: 'Small swaps that cut smoke and exhaust',
    to: '/app/habits',
    Icon: Leaf,
  },
];
