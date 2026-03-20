import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname } from 'node:path';
import type { JournalEntry, CheckpointEntry, JournalFilters, JournalRemovalFilter } from '../types/journal.js';
import type { IJournalStore } from './JournalStore.js';

interface StoreData {
  entries: JournalEntry[];
  nextRequestId: number;
}

/**
 * File-based journal store for local development.
 * Stores all entries in a single JSON file.
 * Can be swapped for MySQL implementation later.
 */
export class FileJournalStore implements IJournalStore {
  private data: StoreData = { entries: [], nextRequestId: 1 };
  private filePath: string;
  private loaded = false;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    try {
      if (existsSync(this.filePath)) {
        const raw = await readFile(this.filePath, 'utf-8');
        this.data = JSON.parse(raw);
      }
    } catch {
      // Start fresh if file is corrupted
      this.data = { entries: [], nextRequestId: 1 };
    }
    this.loaded = true;
  }

  private async persist(): Promise<void> {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    await writeFile(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  async appendEntry(entry: JournalEntry): Promise<void> {
    await this.ensureLoaded();
    this.data.entries.push(entry);
    await this.persist();
  }

  async getEntries(filters?: JournalFilters): Promise<{ entries: JournalEntry[]; total: number }> {
    await this.ensureLoaded();
    let result = this.data.entries;

    if (filters) {
      if (filters.userId) {
        result = result.filter(e => e.userId === filters.userId);
      }
      if (filters.entityId) {
        result = result.filter(e => e.entityId === filters.entityId);
      }
      if (filters.requestId !== undefined) {
        result = result.filter(e => e.requestId === filters.requestId);
      }
      if (filters.dateFrom) {
        result = result.filter(e => e.createdAt >= filters.dateFrom!);
      }
      if (filters.dateTo) {
        result = result.filter(e => e.createdAt <= filters.dateTo!);
      }
      if (filters.action) {
        result = result.filter(e => e.action === filters.action);
      }
      if (filters.status) {
        result = result.filter(e => e.status === filters.status);
      }
    }

    const total = result.length;

    // Sort newest first for display
    result = [...result].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    // Pagination
    const offset = filters?.offset ?? 0;
    const limit = filters?.limit ?? 100;
    result = result.slice(offset, offset + limit);

    return { entries: result, total };
  }

  async getEntry(id: string): Promise<JournalEntry | null> {
    await this.ensureLoaded();
    return this.data.entries.find(e => e.id === id) ?? null;
  }

  async getEntryByRequestId(requestId: number): Promise<JournalEntry | null> {
    await this.ensureLoaded();
    return this.data.entries.find(e => e.requestId === requestId) ?? null;
  }

  async getEntriesSince(checkpointId: string): Promise<JournalEntry[]> {
    await this.ensureLoaded();
    const cpIndex = this.data.entries.findIndex(e => e.id === checkpointId);
    if (cpIndex === -1) return this.data.entries;
    // Return entries after the checkpoint, in chronological order
    return this.data.entries.slice(cpIndex + 1);
  }

  async getAllEntries(): Promise<JournalEntry[]> {
    await this.ensureLoaded();
    // Return in chronological order for replay
    return [...this.data.entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async getLatestCheckpoint(): Promise<CheckpointEntry | null> {
    await this.ensureLoaded();
    for (let i = this.data.entries.length - 1; i >= 0; i--) {
      if (this.data.entries[i].action === 'Checkpoint') {
        return this.data.entries[i] as CheckpointEntry;
      }
    }
    return null;
  }

  async getCheckpoint(id: string): Promise<CheckpointEntry | null> {
    await this.ensureLoaded();
    const entry = this.data.entries.find(e => e.id === id && e.action === 'Checkpoint');
    return (entry as CheckpointEntry) ?? null;
  }

  async getCheckpoints(): Promise<CheckpointEntry[]> {
    await this.ensureLoaded();
    return this.data.entries
      .filter(e => e.action === 'Checkpoint')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)) as CheckpointEntry[];
  }

  async removeEntries(filter: JournalRemovalFilter): Promise<number> {
    await this.ensureLoaded();
    const before = this.data.entries.length;
    this.data.entries = this.data.entries.filter(entry => {
      let matches = true;
      if (filter.userId) matches = matches && entry.userId === filter.userId;
      if (filter.dateFrom) matches = matches && entry.createdAt >= filter.dateFrom;
      if (filter.dateTo) matches = matches && entry.createdAt <= filter.dateTo;
      if (filter.requestId !== undefined) matches = matches && entry.requestId === filter.requestId;
      // Keep entries that DON'T match the filter
      return !matches;
    });
    const removed = before - this.data.entries.length;
    if (removed > 0) await this.persist();
    return removed;
  }

  async nextRequestId(): Promise<number> {
    await this.ensureLoaded();
    const id = this.data.nextRequestId;
    this.data.nextRequestId++;
    await this.persist();
    return id;
  }

  async isRequestIdUsed(requestId: number): Promise<boolean> {
    await this.ensureLoaded();
    return this.data.entries.some(e => e.requestId === requestId);
  }
}
