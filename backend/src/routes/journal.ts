import { Router, type Request, type Response } from 'express';
import type { JournalEngine } from '../journal/JournalEngine.js';
import type { ActionRequest, JournalFilters } from '../types/journal.js';

export function createJournalRoutes(engine: JournalEngine): Router {
  const router = Router();

  /**
   * POST /api/request
   * Step 1 of the two-step protocol: get a request ID.
   */
  router.post('/request', async (_req: Request, res: Response) => {
    try {
      const requestId = await engine.requestId();
      res.json({ requestId });
    } catch (err) {
      res.status(500).json({ error: 'Failed to allocate request ID' });
    }
  });

  /**
   * POST /api/action
   * Step 2: submit an action with the assigned request ID.
   */
  router.post('/action', async (req: Request, res: Response) => {
    try {
      const body = req.body as ActionRequest;
      if (!body.requestId || !body.action || !body.entityType) {
        res.status(400).json({ error: 'Missing required fields: requestId, action, entityType' });
        return;
      }

      // Determine user ID from auth header or default
      const userId = req.headers['x-user-id'] as string ?? 'user-1';
      const source = req.headers['x-source'] as 'gui' | 'agent' ?? 'gui';

      const response = await engine.processAction(body, userId, source);
      const status = response.returnCode === 'failed' ? 400 : 200;
      res.status(status).json(response);
    } catch (err) {
      res.status(500).json({ error: 'Failed to process action' });
    }
  });

  /**
   * GET /api/journal
   * Browse journal entries with filters and pagination.
   */
  router.get('/journal', async (req: Request, res: Response) => {
    try {
      const filters: JournalFilters = {
        userId: req.query.userId as string | undefined,
        entityId: req.query.entityId as string | undefined,
        requestId: req.query.requestId ? parseInt(req.query.requestId as string) : undefined,
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
        action: req.query.action as JournalFilters['action'],
        status: req.query.status as JournalFilters['status'],
        limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      };

      const result = await engine.store.getEntries(filters);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch journal entries' });
    }
  });

  /**
   * GET /api/journal/checkpoints
   * List all checkpoints.
   */
  router.get('/journal/checkpoints', async (_req: Request, res: Response) => {
    try {
      const checkpoints = await engine.checkpointManager.listCheckpoints();
      // Return without the full snapshot data (too large for listing)
      const summary = checkpoints.map(cp => ({
        id: cp.id,
        requestId: cp.requestId,
        triggeredBy: cp.payload.triggeredBy,
        createdAt: cp.createdAt,
      }));
      res.json(summary);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch checkpoints' });
    }
  });

  /**
   * POST /api/journal/checkpoint
   * Create a manual checkpoint.
   */
  router.post('/journal/checkpoint', async (_req: Request, res: Response) => {
    try {
      const checkpoint = await engine.checkpointManager.createCheckpoint('manual');
      res.json({
        id: checkpoint.id,
        requestId: checkpoint.requestId,
        createdAt: checkpoint.createdAt,
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to create checkpoint' });
    }
  });

  /**
   * POST /api/journal/:entryId/approve
   * Approve a pending agent action.
   */
  router.post('/journal/:entryId/approve', async (req: Request, res: Response) => {
    try {
      const approverUserId = req.headers['x-user-id'] as string ?? 'user-1';
      const entryId = req.params.entryId as string;
      const result = await engine.approveEntry(entryId, approverUserId);
      const status = result.returnCode === 'failed' ? 400 : 200;
      res.status(status).json(result);
    } catch (err) {
      res.status(500).json({ error: 'Failed to approve entry' });
    }
  });

  /**
   * POST /api/journal/:entryId/reject
   * Reject a pending agent action.
   */
  router.post('/journal/:entryId/reject', async (req: Request, res: Response) => {
    try {
      const rejectorUserId = req.headers['x-user-id'] as string ?? 'user-1';
      const entryId = req.params.entryId as string;
      const result = await engine.rejectEntry(entryId, rejectorUserId);
      const status = result.returnCode === 'failed' ? 400 : 200;
      res.status(status).json(result);
    } catch (err) {
      res.status(500).json({ error: 'Failed to reject entry' });
    }
  });

  return router;
}
