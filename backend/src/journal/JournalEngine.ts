import { v4 as uuidv4 } from 'uuid';
import type { JournalEntry, ActionRequest, ActionResponse } from '../types/journal.js';
import type { MaterialisedState } from '../types/entities.js';
import type { IJournalStore } from './JournalStore.js';
import { StateMaterialiser } from './StateMaterialiser.js';
import { CheckpointManager } from './CheckpointManager.js';

/**
 * Central engine that coordinates journal writes and state materialisation.
 * All mutations flow through here.
 */
export class JournalEngine {
  public readonly materialiser: StateMaterialiser;
  public readonly checkpointManager: CheckpointManager;

  constructor(public readonly store: IJournalStore) {
    this.materialiser = new StateMaterialiser(store);
    this.checkpointManager = new CheckpointManager(store, this.materialiser);
  }

  /**
   * Initialise: rebuild state from journal, start checkpoint schedule.
   */
  async init(): Promise<void> {
    await this.materialiser.rebuild();
    this.checkpointManager.startWeeklySchedule();
    console.log('[JournalEngine] Initialised. State rebuilt from journal.');
  }

  /**
   * Get the current materialised state.
   */
  getState(): MaterialisedState {
    return this.materialiser.getState();
  }

  /**
   * Allocate a new request ID.
   */
  async requestId(): Promise<number> {
    return this.store.nextRequestId();
  }

  /**
   * Process an action request through the journal.
   * 1. Validates the request ID
   * 2. Checks if the user is an agent requiring approval
   * 3. Writes the journal entry
   * 4. Applies to materialised state (if not pending)
   * 5. Returns the response
   */
  async processAction(
    request: ActionRequest,
    userId: string,
    source: JournalEntry['source'] = 'gui',
  ): Promise<ActionResponse> {
    // Check if request ID already used
    if (await this.store.isRequestIdUsed(request.requestId)) {
      return {
        requestId: request.requestId,
        returnCode: 'failed',
        error: `Request ID ${request.requestId} has already been used`,
      };
    }

    // Check if agent user requires approval
    const state = this.getState();
    const user = state.users.find(u => u.id === userId);
    const needsApproval = user?.isAgent && user?.requiresApproval;

    // Generate entity ID for creates
    let entityId = request.entityId;
    if (!entityId || entityId === 'new') {
      entityId = uuidv4();
    }

    const now = new Date().toISOString();
    const entryStatus = needsApproval ? 'pending' as const : 'applied' as const;
    const responseCode = needsApproval ? 'pending_approval' as const : 'completed' as const;

    const entry: JournalEntry = {
      id: uuidv4(),
      requestId: request.requestId,
      userId,
      action: request.action,
      entityType: request.entityType,
      entityId,
      payload: request.payload,
      responseCode,
      responsePayload: { entityId },
      source,
      status: entryStatus,
      createdAt: now,
    };

    await this.store.appendEntry(entry);

    // Apply to state immediately if not pending
    if (entryStatus === 'applied') {
      this.materialiser.applyEntry(entry);
    }

    return {
      requestId: request.requestId,
      returnCode: responseCode,
      entityId,
    };
  }

  /**
   * Approve a pending journal entry (for agent-submitted actions).
   */
  async approveEntry(entryId: string, approverUserId: string): Promise<ActionResponse> {
    const entry = await this.store.getEntry(entryId);
    if (!entry) {
      return { requestId: 0, returnCode: 'failed', error: 'Entry not found' };
    }
    if (entry.status !== 'pending') {
      return { requestId: entry.requestId, returnCode: 'failed', error: 'Entry is not pending' };
    }

    // Create an approval entry in the journal
    const requestId = await this.store.nextRequestId();
    const approvalEntry: JournalEntry = {
      id: uuidv4(),
      requestId,
      userId: approverUserId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      payload: { ...entry.payload, approvedFrom: entryId },
      responseCode: 'completed',
      responsePayload: entry.responsePayload,
      source: 'gui',
      status: 'applied',
      createdAt: new Date().toISOString(),
    };

    await this.store.appendEntry(approvalEntry);
    this.materialiser.applyEntry(approvalEntry);

    return {
      requestId: approvalEntry.requestId,
      returnCode: 'completed',
      entityId: entry.entityId ?? undefined,
    };
  }

  /**
   * Reject a pending journal entry.
   */
  async rejectEntry(entryId: string, rejectorUserId: string): Promise<ActionResponse> {
    const entry = await this.store.getEntry(entryId);
    if (!entry) {
      return { requestId: 0, returnCode: 'failed', error: 'Entry not found' };
    }
    if (entry.status !== 'pending') {
      return { requestId: entry.requestId, returnCode: 'failed', error: 'Entry is not pending' };
    }

    // Append a revert entry (the original stays as-is in the journal)
    const requestId = await this.store.nextRequestId();
    const revertEntry: JournalEntry = {
      id: uuidv4(),
      requestId,
      userId: rejectorUserId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      payload: { rejectedFrom: entryId, reason: 'Agent action rejected by approver' },
      responseCode: 'completed',
      responsePayload: null,
      source: 'gui',
      status: 'reverted',
      createdAt: new Date().toISOString(),
    };

    await this.store.appendEntry(revertEntry);

    return {
      requestId: revertEntry.requestId,
      returnCode: 'completed',
    };
  }
}
