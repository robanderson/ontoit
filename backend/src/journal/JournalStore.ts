import type { JournalEntry, CheckpointEntry, JournalFilters, JournalRemovalFilter } from '../types/journal.js';

export interface IJournalStore {
  /** Append a new entry to the journal (never modifies existing entries). */
  appendEntry(entry: JournalEntry): Promise<void>;

  /** Get journal entries with optional filters and pagination. */
  getEntries(filters?: JournalFilters): Promise<{ entries: JournalEntry[]; total: number }>;

  /** Get a single entry by ID. */
  getEntry(id: string): Promise<JournalEntry | null>;

  /** Get a single entry by request ID. */
  getEntryByRequestId(requestId: number): Promise<JournalEntry | null>;

  /** Get all entries since a checkpoint (for replay). */
  getEntriesSince(checkpointId: string): Promise<JournalEntry[]>;

  /** Get all entries (for full replay when no checkpoint exists). */
  getAllEntries(): Promise<JournalEntry[]>;

  /** Get the most recent checkpoint entry. */
  getLatestCheckpoint(): Promise<CheckpointEntry | null>;

  /** Get a specific checkpoint by ID. */
  getCheckpoint(id: string): Promise<CheckpointEntry | null>;

  /** List all checkpoints. */
  getCheckpoints(): Promise<CheckpointEntry[]>;

  /**
   * Remove entries matching the filter (super-admin only).
   * This is the one exception to the append-only rule — used for
   * removing bad entries before a rebuild.
   * Returns the number of entries removed.
   */
  removeEntries(filter: JournalRemovalFilter): Promise<number>;

  /** Get the next request ID (atomic counter). */
  nextRequestId(): Promise<number>;

  /** Check if a request ID has already been used. */
  isRequestIdUsed(requestId: number): Promise<boolean>;
}
