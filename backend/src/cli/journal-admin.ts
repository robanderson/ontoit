#!/usr/bin/env node

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
import { FileJournalStore } from '../journal/FileJournalStore.js';
import { JournalEngine } from '../journal/JournalEngine.js';
import type { JournalRemovalFilter, JournalFilters } from '../types/journal.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '..', '..', 'data');
const JOURNAL_FILE = resolve(DATA_DIR, 'journal.json');

const args = process.argv.slice(2);
const command = args[0];

function parseFlags(args: string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (const arg of args) {
    const match = arg.match(/^--(\w+)=(.+)$/);
    if (match) {
      flags[match[1]] = match[2];
    }
  }
  return flags;
}

async function confirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(`${question} (y/N): `, answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

async function main() {
  const store = new FileJournalStore(JOURNAL_FILE);
  const engine = new JournalEngine(store);

  switch (command) {
    case 'list': {
      const flags = parseFlags(args.slice(1));
      const filters: JournalFilters = {
        userId: flags.userId,
        entityId: flags.entityId,
        requestId: flags.requestId ? parseInt(flags.requestId) : undefined,
        dateFrom: flags.dateFrom,
        dateTo: flags.dateTo,
        action: flags.action as JournalFilters['action'],
        limit: flags.limit ? parseInt(flags.limit) : 20,
        offset: flags.offset ? parseInt(flags.offset) : 0,
      };

      const { entries, total } = await store.getEntries(filters);
      console.log(`\nJournal entries (${entries.length} of ${total} total):\n`);
      console.log('  ReqID  | Status    | Source  | Action            | Entity                | User            | Date');
      console.log('  -------+-----------+---------+-------------------+-----------------------+-----------------+-----');
      for (const e of entries) {
        const reqId = String(e.requestId).padStart(6);
        const status = e.status.padEnd(9);
        const source = e.source.padEnd(7);
        const action = e.action.padEnd(17);
        const entity = `${e.entityType}:${e.entityId ?? 'null'}`.padEnd(21);
        const user = e.userId.padEnd(15);
        const date = e.createdAt.slice(0, 19);
        console.log(`  ${reqId} | ${status} | ${source} | ${action} | ${entity} | ${user} | ${date}`);
      }
      console.log('');
      break;
    }

    case 'remove': {
      const flags = parseFlags(args.slice(1));
      const filter: JournalRemovalFilter = {
        userId: flags.userId,
        dateFrom: flags.dateFrom,
        dateTo: flags.dateTo,
        requestId: flags.requestId ? parseInt(flags.requestId) : undefined,
      };

      if (!filter.userId && !filter.dateFrom && !filter.dateTo && filter.requestId === undefined) {
        console.error('Error: At least one filter is required (--userId, --dateFrom, --dateTo, --requestId)');
        process.exit(1);
      }

      // Preview what will be removed
      const preview = await store.getEntries({
        ...filter,
        limit: 1000,
      });
      console.log(`\nThis will remove ${preview.total} journal entries matching:`);
      if (filter.userId) console.log(`  userId = ${filter.userId}`);
      if (filter.dateFrom) console.log(`  dateFrom = ${filter.dateFrom}`);
      if (filter.dateTo) console.log(`  dateTo = ${filter.dateTo}`);
      if (filter.requestId !== undefined) console.log(`  requestId = ${filter.requestId}`);
      console.log('');

      if (preview.total > 0) {
        console.log('Sample entries to be removed:');
        for (const e of preview.entries.slice(0, 5)) {
          console.log(`  #${e.requestId} ${e.action} ${e.entityType}:${e.entityId} by ${e.userId} at ${e.createdAt}`);
        }
        if (preview.total > 5) {
          console.log(`  ... and ${preview.total - 5} more`);
        }
        console.log('');
      }

      const ok = await confirm('WARNING: This is irreversible. Proceed?');
      if (!ok) {
        console.log('Aborted.');
        process.exit(0);
      }

      const removed = await store.removeEntries(filter);
      console.log(`Removed ${removed} journal entries.`);
      console.log('Run "journal-admin rebuild" to update the materialised state.');
      break;
    }

    case 'rebuild': {
      const flags = parseFlags(args.slice(1));
      console.log('Rebuilding materialised state from journal...');

      const state = await engine.materialiser.rebuild(flags.fromCheckpoint);
      console.log(`\nRebuild complete:`);
      console.log(`  Tasks: ${state.tasks.length}`);
      console.log(`  Tags:  ${state.tags.length}`);
      console.log(`  Notes: ${state.notes.length}`);
      console.log(`  Links: ${state.links.length}`);
      console.log(`  Users: ${state.users.length}`);
      console.log('');
      console.log('Note: The running server uses its own in-memory state.');
      console.log('Restart the server to pick up the rebuilt state.');
      break;
    }

    case 'checkpoint': {
      const subCommand = args[1];

      if (subCommand === 'create') {
        await engine.init();
        const cp = await engine.checkpointManager.createCheckpoint('manual');
        console.log(`Checkpoint created: ${cp.id} at ${cp.createdAt}`);
      } else if (subCommand === 'list') {
        const checkpoints = await store.getCheckpoints();
        if (checkpoints.length === 0) {
          console.log('\nNo checkpoints found.\n');
        } else {
          console.log(`\n${checkpoints.length} checkpoints:\n`);
          for (const cp of checkpoints) {
            const data = cp.payload.snapshotData;
            console.log(`  ${cp.id}`);
            console.log(`    Created:  ${cp.createdAt}`);
            console.log(`    Trigger:  ${cp.payload.triggeredBy}`);
            console.log(`    Snapshot: ${data.tasks.length} tasks, ${data.tags.length} tags, ${data.users.length} users`);
            console.log('');
          }
        }
      } else {
        console.log('Usage: journal-admin checkpoint <create|list>');
      }
      break;
    }

    case 'stats': {
      const { entries, total } = await store.getEntries({ limit: 0 });
      const all = await store.getAllEntries();
      const checkpoints = await store.getCheckpoints();

      const byAction: Record<string, number> = {};
      const byUser: Record<string, number> = {};
      const bySource: Record<string, number> = {};
      const byStatus: Record<string, number> = {};

      for (const e of all) {
        byAction[e.action] = (byAction[e.action] ?? 0) + 1;
        byUser[e.userId] = (byUser[e.userId] ?? 0) + 1;
        bySource[e.source] = (bySource[e.source] ?? 0) + 1;
        byStatus[e.status] = (byStatus[e.status] ?? 0) + 1;
      }

      console.log(`\nJournal Statistics:`);
      console.log(`  Total entries:  ${total}`);
      console.log(`  Checkpoints:    ${checkpoints.length}`);
      console.log(`\n  By action:`);
      for (const [k, v] of Object.entries(byAction).sort((a, b) => b[1] - a[1])) {
        console.log(`    ${k.padEnd(20)} ${v}`);
      }
      console.log(`\n  By user:`);
      for (const [k, v] of Object.entries(byUser).sort((a, b) => b[1] - a[1])) {
        console.log(`    ${k.padEnd(20)} ${v}`);
      }
      console.log(`\n  By source:`);
      for (const [k, v] of Object.entries(bySource).sort((a, b) => b[1] - a[1])) {
        console.log(`    ${k.padEnd(20)} ${v}`);
      }
      console.log(`\n  By status:`);
      for (const [k, v] of Object.entries(byStatus).sort((a, b) => b[1] - a[1])) {
        console.log(`    ${k.padEnd(20)} ${v}`);
      }
      console.log('');
      break;
    }

    default:
      console.log(`
OnToIt Journal Admin CLI

Usage:
  journal-admin list     [--userId=X] [--entityId=X] [--requestId=N]
                         [--dateFrom=YYYY-MM-DD] [--dateTo=YYYY-MM-DD]
                         [--action=CreateTask] [--limit=20] [--offset=0]
      List journal entries with optional filters.

  journal-admin remove   --userId=agent99 [--dateFrom=2026-01-01] [--dateTo=2026-01-31]
                         [--requestId=N]
      Remove journal entries matching the filter. SUPER-ADMIN ONLY.
      Requires at least one filter. Shows preview and asks for confirmation.

  journal-admin rebuild  [--fromCheckpoint=<checkpoint-id>]
      Rebuild the materialised state by replaying the journal.
      Optionally start from a specific checkpoint.

  journal-admin checkpoint create
      Create a manual checkpoint of the current state.

  journal-admin checkpoint list
      List all checkpoints with summary info.

  journal-admin stats
      Show journal statistics (entry counts by action, user, source, status).

Examples:
  journal-admin list --userId=agent-email-monitor --limit=50
  journal-admin remove --userId=agent-99 --dateFrom=2026-03-15 --dateTo=2026-03-15
  journal-admin rebuild
  journal-admin rebuild --fromCheckpoint=abc123-def456
  journal-admin checkpoint create
      `);
      break;
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
