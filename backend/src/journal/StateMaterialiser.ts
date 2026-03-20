import { v4 as uuidv4 } from 'uuid';
import type { MaterialisedState, Task, Tag, TaskNote, TaskLink, User } from '../types/entities.js';
import type { JournalEntry, CheckpointEntry } from '../types/journal.js';
import type { IJournalStore } from './JournalStore.js';

/**
 * Replays journal entries to produce the current materialised state.
 * Entries with status 'pending' or 'reverted' are skipped.
 */
export class StateMaterialiser {
  private state: MaterialisedState = {
    tasks: [],
    tags: [],
    notes: [],
    links: [],
    users: [],
  };

  constructor(private journalStore: IJournalStore) {}

  getState(): MaterialisedState {
    return this.state;
  }

  /**
   * Rebuild state from scratch, or from a specific checkpoint.
   */
  async rebuild(checkpointId?: string): Promise<MaterialisedState> {
    let entries: JournalEntry[];

    if (checkpointId) {
      const checkpoint = await this.journalStore.getCheckpoint(checkpointId);
      if (checkpoint) {
        this.state = structuredClone(checkpoint.payload.snapshotData);
        entries = await this.journalStore.getEntriesSince(checkpointId);
      } else {
        this.state = { tasks: [], tags: [], notes: [], links: [], users: [] };
        entries = await this.journalStore.getAllEntries();
      }
    } else {
      // Try latest checkpoint first
      const checkpoint = await this.journalStore.getLatestCheckpoint();
      if (checkpoint) {
        this.state = structuredClone(checkpoint.payload.snapshotData);
        entries = await this.journalStore.getEntriesSince(checkpoint.id);
      } else {
        this.state = { tasks: [], tags: [], notes: [], links: [], users: [] };
        entries = await this.journalStore.getAllEntries();
      }
    }

    // Replay entries in chronological order
    for (const entry of entries) {
      this.applyEntry(entry);
    }

    return this.state;
  }

  /**
   * Apply a single journal entry to the current state.
   * Skips entries that are pending or reverted.
   */
  applyEntry(entry: JournalEntry): void {
    if (entry.status !== 'applied') return;
    if (entry.action === 'Checkpoint') return;

    switch (entry.action) {
      case 'CreateTask': this.handleCreateTask(entry); break;
      case 'UpdateTask': this.handleUpdateTask(entry); break;
      case 'MoveTask': this.handleMoveTask(entry); break;
      case 'DeleteTask': this.handleDeleteTask(entry); break;
      case 'CreateTag': this.handleCreateTag(entry); break;
      case 'UpdateTag': this.handleUpdateTag(entry); break;
      case 'DeleteTag': this.handleDeleteTag(entry); break;
      case 'AddNote': this.handleAddNote(entry); break;
      case 'AddLink': this.handleAddLink(entry); break;
      case 'RemoveLink': this.handleRemoveLink(entry); break;
      case 'CreateUser': this.handleCreateUser(entry); break;
      case 'UpdateUser': this.handleUpdateUser(entry); break;
    }
  }

  private handleCreateTask(entry: JournalEntry): void {
    const p = entry.payload;
    const entityId = entry.entityId ?? entry.responsePayload?.entityId as string ?? uuidv4();
    const now = entry.createdAt;

    // Check if task already exists (idempotency)
    if (this.state.tasks.some(t => t.id === entityId)) return;

    const task: Task = {
      id: entityId,
      title: p.title as string ?? '',
      description: p.description as string ?? '',
      status: p.status as Task['status'] ?? 'unassigned',
      priority: p.priority as Task['priority'] ?? 'medium',
      assignedTo: p.assignedTo as string ?? null,
      createdBy: entry.userId,
      parentTaskId: p.parentTaskId as string ?? null,
      dueDate: p.dueDate as string ?? null,
      sortOrder: p.sortOrder as number ?? 0,
      tags: p.tags as string[] ?? [],
      createdAt: now,
      updatedAt: now,
    };
    this.state.tasks.push(task);

    // Handle sub-tasks if provided inline
    if (Array.isArray(p.subTasks)) {
      for (const subTitle of p.subTasks as string[]) {
        const subTask: Task = {
          id: uuidv4(),
          title: subTitle,
          description: '',
          status: task.status,
          priority: task.priority,
          assignedTo: task.assignedTo,
          createdBy: entry.userId,
          parentTaskId: entityId,
          dueDate: null,
          sortOrder: 0,
          tags: [],
          createdAt: now,
          updatedAt: now,
        };
        this.state.tasks.push(subTask);
      }
    }
  }

  private handleUpdateTask(entry: JournalEntry): void {
    const task = this.state.tasks.find(t => t.id === entry.entityId);
    if (!task) return;

    const p = entry.payload;
    if (p.title !== undefined) task.title = p.title as string;
    if (p.description !== undefined) task.description = p.description as string;
    if (p.priority !== undefined) task.priority = p.priority as Task['priority'];
    if (p.dueDate !== undefined) task.dueDate = p.dueDate as string | null;
    if (p.tags !== undefined) task.tags = p.tags as string[];
    if (p.assignedTo !== undefined) task.assignedTo = p.assignedTo as string | null;
    if (p.status !== undefined) task.status = p.status as Task['status'];
    if (p.sortOrder !== undefined) task.sortOrder = p.sortOrder as number;
    if (p.parentTaskId !== undefined) task.parentTaskId = p.parentTaskId as string | null;
    task.updatedAt = entry.createdAt;
  }

  private handleMoveTask(entry: JournalEntry): void {
    const task = this.state.tasks.find(t => t.id === entry.entityId);
    if (!task) return;

    const p = entry.payload;
    if (p.status !== undefined) task.status = p.status as Task['status'];
    if (p.sortOrder !== undefined) task.sortOrder = p.sortOrder as number;
    if (p.assignedTo !== undefined) task.assignedTo = p.assignedTo as string | null;
    task.updatedAt = entry.createdAt;
  }

  private handleDeleteTask(entry: JournalEntry): void {
    const task = this.state.tasks.find(t => t.id === entry.entityId);
    if (task) {
      task.status = 'archived';
      task.updatedAt = entry.createdAt;
    }
  }

  private handleCreateTag(entry: JournalEntry): void {
    const entityId = entry.entityId ?? entry.responsePayload?.entityId as string ?? uuidv4();
    if (this.state.tags.some(t => t.id === entityId)) return;

    const tag: Tag = {
      id: entityId,
      name: entry.payload.name as string ?? '',
      colour: entry.payload.colour as string ?? '#888888',
    };
    this.state.tags.push(tag);
  }

  private handleUpdateTag(entry: JournalEntry): void {
    const tag = this.state.tags.find(t => t.id === entry.entityId);
    if (!tag) return;

    if (entry.payload.name !== undefined) tag.name = entry.payload.name as string;
    if (entry.payload.colour !== undefined) tag.colour = entry.payload.colour as string;
  }

  private handleDeleteTag(entry: JournalEntry): void {
    this.state.tags = this.state.tags.filter(t => t.id !== entry.entityId);
  }

  private handleAddNote(entry: JournalEntry): void {
    const entityId = entry.entityId ?? entry.responsePayload?.entityId as string ?? uuidv4();
    if (this.state.notes.some(n => n.id === entityId)) return;

    const note: TaskNote = {
      id: entityId,
      taskId: entry.payload.taskId as string,
      authorId: entry.userId,
      content: entry.payload.content as string ?? '',
      isSystem: entry.payload.isSystem as boolean ?? false,
      createdAt: entry.createdAt,
    };
    this.state.notes.push(note);
  }

  private handleAddLink(entry: JournalEntry): void {
    const entityId = entry.entityId ?? entry.responsePayload?.entityId as string ?? uuidv4();
    if (this.state.links.some(l => l.id === entityId)) return;

    const link: TaskLink = {
      id: entityId,
      taskId: entry.payload.taskId as string,
      url: entry.payload.url as string ?? '',
      linkType: entry.payload.linkType as TaskLink['linkType'] ?? 'external',
      displayName: entry.payload.displayName as string ?? '',
      addedBy: entry.userId,
      createdAt: entry.createdAt,
    };
    this.state.links.push(link);
  }

  private handleRemoveLink(entry: JournalEntry): void {
    this.state.links = this.state.links.filter(l => l.id !== entry.entityId);
  }

  private handleCreateUser(entry: JournalEntry): void {
    const entityId = entry.entityId ?? entry.responsePayload?.entityId as string ?? uuidv4();
    if (this.state.users.some(u => u.id === entityId)) return;

    const p = entry.payload;
    const user: User = {
      id: entityId,
      username: p.username as string ?? '',
      displayName: p.displayName as string ?? '',
      email: p.email as string ?? '',
      role: p.role as User['role'] ?? 'user',
      isAgent: p.isAgent as boolean ?? false,
      requiresApproval: p.requiresApproval as boolean ?? false,
      approverUserId: p.approverUserId as string ?? null,
      createdAt: entry.createdAt,
    };
    this.state.users.push(user);
  }

  private handleUpdateUser(entry: JournalEntry): void {
    const user = this.state.users.find(u => u.id === entry.entityId);
    if (!user) return;

    const p = entry.payload;
    if (p.displayName !== undefined) user.displayName = p.displayName as string;
    if (p.email !== undefined) user.email = p.email as string;
    if (p.role !== undefined) user.role = p.role as User['role'];
    if (p.requiresApproval !== undefined) user.requiresApproval = p.requiresApproval as boolean;
    if (p.approverUserId !== undefined) user.approverUserId = p.approverUserId as string | null;
  }
}
