import express from 'express';
import cors from 'cors';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FileJournalStore } from './journal/FileJournalStore.js';
import { JournalEngine } from './journal/JournalEngine.js';
import { createJournalRoutes } from './routes/journal.js';
import { createTaskRoutes } from './routes/tasks.js';
import { createTagRoutes } from './routes/tags.js';
import { createUserRoutes } from './routes/users.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '..', 'data');
const JOURNAL_FILE = resolve(DATA_DIR, 'journal.json');

const PORT = parseInt(process.env.PORT ?? '3001');

async function main() {
  // Initialise journal engine
  const journalStore = new FileJournalStore(JOURNAL_FILE);
  const engine = new JournalEngine(journalStore);
  await engine.init();

  // If no users exist, seed the default users
  const state = engine.getState();
  if (state.users.length === 0) {
    console.log('[Server] No users found — seeding default users...');
    await seedDefaultData(engine);
  }

  // Create Express app
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Mount routes
  app.use('/api', createJournalRoutes(engine));
  app.use('/api/tasks', createTaskRoutes(engine));
  app.use('/api/tags', createTagRoutes(engine));
  app.use('/api/users', createUserRoutes(engine));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', journalEntries: engine.getState().tasks.length });
  });

  app.listen(PORT, () => {
    console.log(`[Server] OnToIt backend running on http://localhost:${PORT}`);
    console.log(`[Server] Journal file: ${JOURNAL_FILE}`);
  });
}

/**
 * Seed default users and tags through the journal so everything is tracked.
 */
async function seedDefaultData(engine: JournalEngine) {
  const seeds = [
    // Users
    {
      action: 'CreateUser' as const,
      entityType: 'user' as const,
      entityId: 'user-1',
      payload: { username: 'testuser', displayName: 'Test User', email: 'test@local.dev', role: 'admin' },
    },
    {
      action: 'CreateUser' as const,
      entityType: 'user' as const,
      entityId: 'user-2',
      payload: { username: 'jane', displayName: 'Jane Smith', email: 'jane@local.dev', role: 'user' },
    },
    {
      action: 'CreateUser' as const,
      entityType: 'user' as const,
      entityId: 'user-3',
      payload: { username: 'bob', displayName: 'Bob Chen', email: 'bob@local.dev', role: 'user' },
    },
    // Tags
    {
      action: 'CreateTag' as const,
      entityType: 'tag' as const,
      entityId: 'tag-1',
      payload: { name: 'Design', colour: '#4c6ef5' },
    },
    {
      action: 'CreateTag' as const,
      entityType: 'tag' as const,
      entityId: 'tag-2',
      payload: { name: 'Development', colour: '#2b8a3e' },
    },
    {
      action: 'CreateTag' as const,
      entityType: 'tag' as const,
      entityId: 'tag-3',
      payload: { name: 'Urgent', colour: '#c92a2a' },
    },
    {
      action: 'CreateTag' as const,
      entityType: 'tag' as const,
      entityId: 'tag-4',
      payload: { name: 'Review', colour: '#e8590c' },
    },
    {
      action: 'CreateTag' as const,
      entityType: 'tag' as const,
      entityId: 'tag-5',
      payload: { name: 'Documentation', colour: '#1971c2' },
    },
    {
      action: 'CreateTag' as const,
      entityType: 'tag' as const,
      entityId: 'tag-6',
      payload: { name: 'Ferment Checks', colour: '#862e9c' },
    },
  ];

  for (const seed of seeds) {
    const requestId = await engine.requestId();
    await engine.processAction(
      { requestId, ...seed },
      'system',
      'system',
    );
  }

  console.log('[Server] Default users and tags seeded via journal.');
}

main().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
