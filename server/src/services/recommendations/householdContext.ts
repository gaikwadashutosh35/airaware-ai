import { z } from 'zod';
import type { HouseholdContext } from '../../../../shared/contracts.ts';

// Every field optional; unknown fields rejected. No medical fields by
// design (PRD §10).
export const householdContextSchema: z.ZodType<HouseholdContext> =
  z.strictObject({
    routine: z
      .strictObject({
        commuteMode: z
          .enum([
            'walk',
            'cycle',
            'two_wheeler',
            'car',
            'public_transport',
            'work_from_home',
          ])
          .optional(),
        outdoorExercise: z.boolean().optional(),
        schoolCommute: z.boolean().optional(),
      })
      .optional(),
    home: z
      .strictObject({
        nearBusyRoad: z.enum(['yes', 'no', 'unknown']).optional(),
        cookingFuel: z
          .enum(['lpg', 'electric', 'biomass', 'other', 'prefer_not_to_say'])
          .optional(),
        kitchenExhaust: z.boolean().optional(),
        airPurifier: z.boolean().optional(),
      })
      .optional(),
    householdNeeds: z
      .strictObject({
        includesChildren: z.boolean().optional(),
        includesOlderAdults: z.boolean().optional(),
        mayBeMoreSensitive: z.boolean().optional(),
      })
      .optional(),
  });
