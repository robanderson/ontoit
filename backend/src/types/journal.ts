import type { MaterialisedState } from './entities.js';

export type JournalActionType =
  | 'CreateTask' | 'UpdateTask' | 'MoveTask' | 'DeleteTask'
  | 'CreateTag' | 'UpdateTag' | 'DeleteTag'
  | 'AddNote' | 'AddLink' | 'RemoveLink'
  | 'CreateUser' | 'UpdateUser'
  | 'Checkpoint';

export type JournalEntryStatus = 'applied' | 'pending' | 'reverted';
export type JournalSource = 'gui' | 'agent' | 'system' | 'cli';

export interface JournalEntry {
  id: string;
  requestId: number;
  userId: string;
  action: JournalActionType;
  entityType: 'task' | 'tag' | 'note' | 'link' | 'user' | 'system';
  entityId: string | null;
  payload: Record<string, unknown>;
  responseCode: 'completed' | 'failed' | 'pending_approval';
  responsePayload: Record<string, unknown> | null;
  source: JournalSource;
  status: JournalEntryStatus;
  createdAt: string;
}

export interface CheckpointEntry extends JournalEntry {
  action: 'Checkpoint';
  entityType: 'system';
  payload: {
    triggeredBy: 'automatic' | 'manual';
    snapshotData: MaterialisedState;
  };
}

export interface JournalFilters {
  userId?: string;
  entityId?: string;
  requestId?: number;
  dateFrom?: string;
  dateTo?: string;
  action?: JournalActionType;
  status?: JournalEntryStatus;
  limit?: number;
  offset?: number;
}

export interface JournalRemovalFilter {
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  requestId?: number;
}

export interface RequestIdResponse {
  requestId: number;
}

export interface ActionRequest {
  requestId: number;
  action: JournalActionType;
  entityType: 'task' | 'tag' | 'note' | 'link' | 'user';
  entityId?: string;
  payload: Record<string, unknown>;
}

export interface ActionResponse {
  requestId: number;
  returnCode: 'completed' | 'failed' | 'pending_approval';
  entityId?: string;
  error?: string;
}
