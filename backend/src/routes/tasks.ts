import { Router, type Request, type Response } from 'express';
import type { JournalEngine } from '../journal/JournalEngine.js';

export function createTaskRoutes(engine: JournalEngine): Router {
  const router = Router();

  /**
   * GET /api/tasks
   * Returns current materialised tasks with optional filters.
   */
  router.get('/', (req: Request, res: Response) => {
    const state = engine.getState();
    let tasks = state.tasks;

    // Filter by status
    if (req.query.status) {
      const statuses = (req.query.status as string).split(',');
      tasks = tasks.filter(t => statuses.includes(t.status));
    }

    // Filter by assignedTo
    if (req.query.assignedTo) {
      tasks = tasks.filter(t => t.assignedTo === req.query.assignedTo);
    }

    // Filter by priority
    if (req.query.priority) {
      const priorities = (req.query.priority as string).split(',');
      tasks = tasks.filter(t => priorities.includes(t.priority));
    }

    // Search by title/description
    if (req.query.search) {
      const q = (req.query.search as string).toLowerCase();
      tasks = tasks.filter(t =>
        t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
      );
    }

    // Filter by parentTaskId
    if (req.query.parentTaskId) {
      tasks = tasks.filter(t => t.parentTaskId === req.query.parentTaskId);
    }

    // Exclude archived by default unless explicitly requested
    if (!req.query.status || !(req.query.status as string).includes('archived')) {
      tasks = tasks.filter(t => t.status !== 'archived');
    }

    // Top-level only (no parent) unless parentTaskId filter is set
    if (!req.query.parentTaskId) {
      tasks = tasks.filter(t => !t.parentTaskId);
    }

    res.json(tasks);
  });

  /**
   * GET /api/tasks/:id
   * Single task by ID.
   */
  router.get('/:id', (req: Request, res: Response) => {
    const state = engine.getState();
    const task = state.tasks.find(t => t.id === req.params.id);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json(task);
  });

  /**
   * GET /api/tasks/:id/notes
   * Notes for a task, sorted by createdAt.
   */
  router.get('/:id/notes', (req: Request, res: Response) => {
    const state = engine.getState();
    const notes = state.notes
      .filter(n => n.taskId === req.params.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    res.json(notes);
  });

  /**
   * GET /api/tasks/:id/links
   * Links for a task.
   */
  router.get('/:id/links', (req: Request, res: Response) => {
    const state = engine.getState();
    const links = state.links.filter(l => l.taskId === req.params.id);
    res.json(links);
  });

  /**
   * GET /api/tasks/:id/children
   * Child tasks (sub-tasks), excluding archived.
   */
  router.get('/:id/children', (req: Request, res: Response) => {
    const state = engine.getState();
    const children = state.tasks.filter(
      t => t.parentTaskId === req.params.id && t.status !== 'archived'
    );
    res.json(children);
  });

  return router;
}
