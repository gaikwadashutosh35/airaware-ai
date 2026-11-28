import express, { Router, type RequestHandler } from 'express';
import { parseQuery } from '../errors.ts';
import {
  askRequestSchema,
  type Asker,
} from '../services/recommendations/ask.ts';
import { classify } from '../services/recommendations/askTopics.ts';

// Ask AirAware. The typed question may reach the Ask writer (Claude, J26)
// and nothing else: never logged, stored, cached by its text or sent to
// Gemini. Claude's answer may restate it; the response has no question field.
export function assistantRouter(deps: {
  ask: Asker;
  // The daily plan's limiter: Ask can call Gemini (topics) or Claude (typed
  // questions).
  planLimit: RequestHandler;
}): Router {
  const router = Router();
  router.use(deps.planLimit);
  router.use(express.json({ limit: '4kb' }));

  router.post('/answer', async (req, res) => {
    const body = parseQuery(
      askRequestSchema,
      req.body,
      'Invalid request body.',
    );
    const topic = 'topic' in body ? body.topic : classify(body.question);
    const { place, householdContext } = body;
    // A medical question, now or earlier, never reaches Claude.
    const question =
      'question' in body && topic !== 'medical'
        ? {
            text: body.question,
            history: (body.history ?? []).filter(
              (h) => classify(h.question) !== 'medical',
            ),
          }
        : undefined;
    res.json({
      data: await deps.ask(
        topic,
        { place, householdContext },
        new Date(),
        question,
      ),
    });
  });

  return router;
}
