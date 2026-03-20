import { Router, type Request, type Response } from 'express';
import type { JournalEngine } from '../journal/JournalEngine.js';

export function createUserRoutes(engine: JournalEngine): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    const state = engine.getState();
    // Strip sensitive fields like apiKey
    const users = state.users.map(({ apiKey, ...u }) => u);
    res.json(users);
  });

  router.get('/me', (req: Request, res: Response) => {
    const userId = req.headers['x-user-id'] as string ?? 'user-1';
    const state = engine.getState();
    const user = state.users.find(u => u.id === userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const { apiKey, ...safe } = user;
    res.json(safe);
  });

  return router;
}
