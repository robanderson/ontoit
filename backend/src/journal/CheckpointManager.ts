import { v4 as uuidv4 } from 'uuid';
import type { CheckpointEntry } from '../types/journal.js';
import type { IJournalStore } from './JournalStore.js';
import type { StateMaterialiser } from './StateMaterialiser.js';

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export class CheckpointManager {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private journalStore: IJournalStore,
    private materialiser: StateMaterialiser,
  ) {}

  /**
   * Create a checkpoint that snapshots the current materialised state.
   */
  async createCheckpoint(triggeredBy: 'automatic' | 'manual'): Promise<CheckpointEntry> {
    const requestId = await this.journalStore.nextRequestId();
    const now = new Date().toISOString();

    const entry: CheckpointEntry = {
      id: uuidv4(),
      requestId,
      userId: 'system',
      action: 'Checkpoint',
      entityType: 'system',
      entityId: null,
      payload: {
        triggeredBy,
        snapshotData: structuredClone(this.materialiser.getState()),
      },
      responseCode: 'completed',
      responsePayload: null,
      source: 'system',
      status: 'applied',
      createdAt: now,
    };

    await this.journalStore.appendEntry(entry);
    return entry;
  }

  /**
   * Start the weekly automatic checkpoint schedule.
   */
  startWeeklySchedule(): void {
    if (this.timer) return;
    this.timer = setInterval(async () => {
      try {
        await this.createCheckpoint('automatic');
        console.log(`[Checkpoint] Automatic weekly checkpoint created at ${new Date().toISOString()}`);
      } catch (err) {
        console.error('[Checkpoint] Failed to create automatic checkpoint:', err);
      }
    }, ONE_WEEK_MS);
    console.log('[Checkpoint] Weekly automatic checkpoint schedule started');
  }

  /**
   * Stop the automatic checkpoint schedule.
   */
  stopSchedule(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * List all existing checkpoints.
   */
  async listCheckpoints(): Promise<CheckpointEntry[]> {
    return this.journalStore.getCheckpoints();
  }
}
