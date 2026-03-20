# Journal-Based Event Sourcing Architecture — Implementation Plan

## Design Summary

All data mutations (tasks, tags, notes, links, users) flow through an **append-only journal**. The journal is the single source of truth. The "current state" (what the GUI reads) is a **materialised view** rebuilt by replaying journal entries. A REST API accepts JSON objects from both the GUI and external AI agents using a two-step **RequestID** protocol.

---

## Clarifying Questions — Agreed Answers

| # | Question | Answer |
|---|----------|--------|
| 1 | Scope | All entity changes: tasks, tags, notes, links, users |
| 2 | Storage | Journal in its own store (JSON-optimised). GUI reads from a separate materialised state store. Could both be MySQL or separate. |
| 3 | Granularity | One journal entry per logical action; can contain multiple field changes |
| 4 | Reversal model | Append-only. Reversals are new forward entries. Never edit old entries. |
| 5 | Agent approval | Agents get their own user IDs. Per-agent config: require approval (and by which approver), or auto-apply. |
| 6 | API protocol | REST (JSON in/out). MCP/CLI can wrap it later. |
| 7 | Journal viewer | In Settings UI. Paginated (latest 100), searchable by UserID, TaskID, RequestID, Date. |
| 8 | Rebuild model | Checkpoint records snapshot full state. Recovery = last good checkpoint + replay forward. Bad entries removable before replay. |
| 9 | Checkpoint frequency | Weekly automatic + manual on demand |
| 10 | RequestID scope | All callers (GUI + agents) use two-step RequestID flow. Pairs request with response in journal. |
| 11 | Bad entry removal | Super-admin/CLI function only. SQL-like filter syntax to identify and remove entries before rebuild. |

---

## Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│  React GUI  │     │  AI Agent   │     │   CLI Tool   │
│  (Browser)  │     │  (External) │     │ (Super Admin)│
└──────┬──────┘     └──────┬──────┘     └──────┬───────┘
       │                   │                   │
       └───────────┬───────┘───────────────────┘
                   │ REST API (JSON)
                   ▼
          ┌────────────────┐
          │  Express API   │
          │  /api/request  │  ← Step 1: Get RequestID
          │  /api/action   │  ← Step 2: Submit action with RequestID
          │  /api/journal  │  ← Read journal entries
          └────────┬───────┘
                   │
          ┌────────▼────────┐
          │  Journal Engine │
          │  (Event Store)  │
          └────────┬────────┘
                   │
        ┌──────────┼──────────┐
        ▼                     ▼
┌───────────────┐   ┌────────────────┐
│ Journal Table │   │ Materialised   │
│ (append-only) │   │ State Tables   │
│ MySQL/JSON    │   │ (tasks, tags…) │
└───────────────┘   └────────────────┘
```

---

## Step-by-Step Implementation Plan

### Phase 1: Backend Foundation

#### Step 1.1 — Create backend project structure
- **New directory:** `backend/` alongside `frontend/`
- Init with `npm init`, install Express, TypeScript, ts-node, cors, uuid
- Create `backend/src/server.ts` — Express app entry point
- Create `backend/tsconfig.json`
- **Files:** `backend/package.json`, `backend/src/server.ts`, `backend/tsconfig.json`

#### Step 1.2 — Define journal types
- **New file:** `backend/src/types/journal.ts`
- Types:
  ```typescript
  type JournalActionType =
    | 'CreateTask' | 'UpdateTask' | 'MoveTask' | 'DeleteTask'
    | 'CreateTag' | 'UpdateTag' | 'DeleteTag'
    | 'AddNote' | 'AddLink' | 'RemoveLink'
    | 'CreateUser' | 'UpdateUser'
    | 'Checkpoint';

  interface JournalEntry {
    id: string;              // UUID — unique entry ID
    requestId: number;       // Links request to response
    userId: string;          // Who initiated (human or agent)
    action: JournalActionType;
    entityType: string;      // 'task' | 'tag' | 'note' | 'link' | 'user'
    entityId: string | null; // Target entity ID (null for creates before ID assigned)
    payload: Record<string, any>; // The action data (all field changes)
    responseCode: string;    // 'completed' | 'failed' | 'pending_approval'
    responsePayload: Record<string, any> | null; // e.g. { taskId: '5378226' }
    source: 'gui' | 'agent' | 'system' | 'cli'; // Origin of the change
    status: 'applied' | 'pending' | 'reverted'; // For agent approval flow
    createdAt: string;       // ISO timestamp
  }

  interface CheckpointEntry {
    id: string;
    requestId: number;
    action: 'Checkpoint';
    snapshotData: {          // Full state at this point
      tasks: Task[];
      tags: Tag[];
      notes: TaskNote[];
      links: TaskLink[];
      users: User[];
    };
    triggeredBy: 'automatic' | 'manual';
    createdAt: string;
  }

  interface AgentConfig {
    userId: string;
    displayName: string;
    requiresApproval: boolean;
    approverUserId: string | null; // Which human approves
  }

  interface RequestIdResponse {
    requestId: number;
  }

  interface ActionRequest {
    requestId: number;
    action: JournalActionType;
    entityType: string;
    entityId?: string;       // 'new' for creates
    payload: Record<string, any>;
  }

  interface ActionResponse {
    requestId: number;
    returnCode: 'completed' | 'failed' | 'pending_approval';
    entityId?: string;       // Assigned ID for creates
    error?: string;
  }
  ```

#### Step 1.3 — Shared types
- **New file:** `backend/src/types/entities.ts` — copy/share Task, Tag, TaskNote, TaskLink, User types from frontend
- These are the same types the frontend already uses. Later we can extract to a shared package.

---

### Phase 2: Journal Engine (Core)

#### Step 2.1 — Journal store (initially file-based JSON, MySQL-ready)
- **New file:** `backend/src/journal/JournalStore.ts`
- Interface `IJournalStore` with methods:
  - `appendEntry(entry: JournalEntry): Promise<void>`
  - `getEntries(filters?: JournalFilters): Promise<JournalEntry[]>` — with pagination, search by userId/taskId/requestId/date
  - `getEntriesSince(checkpointId: string): Promise<JournalEntry[]>`
  - `getLatestCheckpoint(): Promise<CheckpointEntry | null>`
  - `removeEntries(filter: JournalRemovalFilter): Promise<number>` — super-admin only
  - `nextRequestId(): Promise<number>` — atomic counter
- **New file:** `backend/src/journal/FileJournalStore.ts` — JSON file implementation for local dev
  - Stores entries in `backend/data/journal.json` (append-friendly)
  - Atomic counter in `backend/data/request_counter.json`
- This can be swapped for a MySQL implementation later without changing the interface

#### Step 2.2 — State materialiser
- **New file:** `backend/src/journal/StateMaterialiser.ts`
- Replays journal entries to produce current state:
  - `rebuild(fromCheckpoint?: CheckpointEntry): MaterialisedState`
  - `applyEntry(state: MaterialisedState, entry: JournalEntry): MaterialisedState`
- Each action type has a handler:
  - `CreateTask` → adds task to state
  - `UpdateTask` → merges fields
  - `MoveTask` → updates status/assignedTo/sortOrder
  - `DeleteTask` → sets status to 'archived'
  - `CreateTag` / `UpdateTag` / `DeleteTag` → tag mutations
  - `AddNote` / `AddLink` / `RemoveLink` → note/link mutations
  - `CreateUser` / `UpdateUser` → user mutations
- Entries with `status: 'pending'` are skipped during replay (not yet approved)
- Entries with `status: 'reverted'` are skipped during replay

#### Step 2.3 — Checkpoint manager
- **New file:** `backend/src/journal/CheckpointManager.ts`
- `createCheckpoint(triggeredBy: 'automatic' | 'manual'): Promise<CheckpointEntry>`
  - Snapshots current materialised state into a Checkpoint journal entry
- `scheduleWeeklyCheckpoint()` — uses `setInterval` or cron-like scheduling
- `rebuildFromCheckpoint(checkpointId?: string): Promise<MaterialisedState>`
  - Loads checkpoint, replays entries after it

---

### Phase 3: REST API

#### Step 3.1 — RequestID endpoint
- **New file:** `backend/src/routes/journal.ts`
- `POST /api/request` → returns `{ requestId: <number> }`
- Logs the ID assignment to the journal as a lightweight entry

#### Step 3.2 — Action endpoint
- `POST /api/action` — accepts `ActionRequest`, returns `ActionResponse`
- Flow:
  1. Validate requestId exists and hasn't been used
  2. Look up user — if agent, check `AgentConfig.requiresApproval`
  3. If approval required: write journal entry with `status: 'pending'`, return `{ returnCode: 'pending_approval' }`
  4. If no approval needed: write journal entry with `status: 'applied'`, apply to materialised state, return `{ returnCode: 'completed', entityId: '...' }`
  5. Write the response to the journal as well (paired by requestId)

#### Step 3.3 — Read endpoints (for GUI)
- `GET /api/tasks` — returns current materialised tasks (with filters)
- `GET /api/tasks/:id` — single task
- `GET /api/tasks/:id/notes` — notes for task
- `GET /api/tasks/:id/links` — links for task
- `GET /api/tasks/:id/children` — child tasks
- `GET /api/tags` — all tags
- `GET /api/users` — all users
- `GET /api/users/me` — current user
- These all read from the materialised state, not the journal directly

#### Step 3.4 — Journal read endpoint
- `GET /api/journal` — paginated journal entries
  - Query params: `?limit=100&offset=0&userId=&taskId=&requestId=&dateFrom=&dateTo=`
- `GET /api/journal/checkpoints` — list checkpoints

#### Step 3.5 — Approval endpoint
- `POST /api/journal/:entryId/approve` — approver confirms a pending entry
  - Changes entry status from `pending` → `applied`
  - Applies the change to materialised state
- `POST /api/journal/:entryId/reject` — rejects a pending entry
  - Appends a new `Revert` entry to the journal

#### Step 3.6 — Checkpoint endpoint
- `POST /api/journal/checkpoint` — manual checkpoint creation

---

### Phase 4: Frontend API Adapter

#### Step 4.1 — New API adapter
- **New file:** `frontend/src/adapters/ApiAdapter.ts`
- Implements the existing `DataAdapter` interface
- Each method:
  1. Calls `POST /api/request` to get a RequestID
  2. Calls `POST /api/action` with the RequestID and action payload
  3. Returns the result
- Read methods (`getTasks`, `getTags`, etc.) call the `GET` endpoints directly

#### Step 4.2 — Environment switching
- **Modify:** `frontend/src/store/useAppStore.ts`
- When environment is `'local'` → use `LocalAdapter` (current behaviour, no journal)
- When environment is `'development'` or `'production'` → use `ApiAdapter`
- This keeps the local/test mode working as-is

---

### Phase 5: Journal Viewer UI

#### Step 5.1 — Settings page / Journal viewer
- **New file:** `frontend/src/components/settings/JournalViewer.tsx`
- Accessible from Settings in the sidebar or header
- Shows latest 100 journal entries in a table/timeline:
  - RequestID, Timestamp, User, Action, Entity, Status
- "Load More" button to fetch next page
- Search/filter bar: by UserID, TaskID, RequestID, Date range
- Each entry expandable to show full payload JSON
- Entries with `status: 'pending'` show Approve/Reject buttons (if current user is the designated approver)

#### Step 5.2 — Checkpoint management in UI
- Button: "Create Checkpoint Now" (manual)
- List of existing checkpoints with timestamps
- "Rebuild from Checkpoint" button (triggers rebuild, super-admin only)

---

### Phase 6: Agent User Management

#### Step 6.1 — Agent configuration
- **New file:** `backend/src/config/agents.ts`
- Agent user records in the users table with a flag `isAgent: true`
- Per-agent config: `requiresApproval`, `approverUserId`
- API authenticates agents via API key (simple Bearer token for now)

#### Step 6.2 — Agent management UI
- **New file:** `frontend/src/components/settings/AgentSettings.tsx`
- List agents, create new agent user, configure approval settings
- Show agent's API key (generate on creation)

---

### Phase 7: Super-Admin CLI

#### Step 7.1 — CLI tool for journal management
- **New file:** `backend/src/cli/journal-admin.ts`
- Commands:
  - `list` — show recent journal entries (with filters)
  - `remove --userId=Agent99 --dateFrom=2025-12-17 --dateTo=2025-12-17` — remove matching entries
  - `rebuild` — rebuild materialised state from journal
  - `rebuild --from-checkpoint=<id>` — rebuild from specific checkpoint
  - `checkpoint create` — create manual checkpoint
  - `checkpoint list` — list all checkpoints
- Uses the same `IJournalStore` interface as the server
- Confirmation prompt before destructive operations

---

## File Summary — What Gets Created / Modified

### New Files (backend)
```
backend/
├── package.json
├── tsconfig.json
├── src/
│   ├── server.ts                          # Express entry point
│   ├── types/
│   │   ├── journal.ts                     # Journal types
│   │   └── entities.ts                    # Shared entity types
│   ├── journal/
│   │   ├── JournalStore.ts                # Interface
│   │   ├── FileJournalStore.ts            # JSON file implementation
│   │   ├── StateMaterialiser.ts           # Replay engine
│   │   └── CheckpointManager.ts           # Checkpoint logic
│   ├── routes/
│   │   ├── journal.ts                     # /api/request, /api/action, /api/journal
│   │   ├── tasks.ts                       # /api/tasks (read)
│   │   ├── tags.ts                        # /api/tags (read)
│   │   └── users.ts                       # /api/users (read)
│   ├── config/
│   │   └── agents.ts                      # Agent user config
│   └── cli/
│       └── journal-admin.ts               # Super-admin CLI
├── data/                                  # Runtime data (gitignored)
│   ├── journal.json
│   └── request_counter.json
```

### New Files (frontend)
```
frontend/src/
├── adapters/
│   └── ApiAdapter.ts                      # REST API adapter
├── components/
│   └── settings/
│       ├── JournalViewer.tsx              # Journal log viewer
│       └── AgentSettings.tsx              # Agent configuration
```

### Modified Files (frontend)
```
frontend/src/
├── store/useAppStore.ts                   # Environment-based adapter selection
├── types/index.ts                         # Add isAgent flag to User type
├── components/layout/Header.tsx           # Settings link
│   or Sidebar.tsx                         # Settings navigation
```

---

## Request/Response Flow Example

```
Agent → POST /api/request
         {}
Server → { "requestId": 1262 }
         (journal entry: requestId=1262, action=RequestIdAssigned, userId=Agent99)

Agent → POST /api/action
         {
           "requestId": 1262,
           "action": "CreateTask",
           "entityType": "task",
           "entityId": "new",
           "payload": {
             "title": "File Tax Return",
             "assignedTo": "user-rob",
             "subTasks": ["Reconcile Xero", "File Return"]
           }
         }
Server → {
           "requestId": 1262,
           "returnCode": "completed",     // or "pending_approval"
           "entityId": "task-5378226"
         }
         (journal entry: requestId=1262, action=CreateTask, entityId=task-5378226,
          status=applied, payload={...}, responsePayload={entityId: task-5378226})
```

---

## Implementation Order

1. **Phase 1** — Backend foundation + types (can run alongside existing frontend)
2. **Phase 2** — Journal engine (core logic, tested independently)
3. **Phase 3** — REST API (backend serves data)
4. **Phase 4** — Frontend ApiAdapter (frontend talks to backend)
5. **Phase 5** — Journal viewer UI
6. **Phase 6** — Agent user management
7. **Phase 7** — Super-admin CLI

Each phase is independently testable. The existing local mode continues to work throughout — no breaking changes until Phase 4 adds the environment switch.
