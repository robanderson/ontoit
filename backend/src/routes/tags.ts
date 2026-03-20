import { Router, type Request, type Response } from 'express';
import type { JournalEngine } from '../journal/JournalEngine.js';

export function createTagRoutes(engine: JournalEngine): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    const state = engine.getState();
    res.json(state.tags);
  });

  return router;
}
