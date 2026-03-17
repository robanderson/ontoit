# OnToIt — Multi-User Task Management System

## Project Plan & User Requirements Specification

---

## 1. Vision & Overview

**OnToIt** is a self-hosted, intranet-based task management application inspired by **Things** and **Trello**. It provides a drag-and-drop Kanban-style interface for managing tasks across teams, with support for task hierarchies (parent/child), file attachments, Google Drive links, and a running diary of notes per task.

The system runs in a Docker container, serves a web UI, and connects to a cloud-hosted MySQL database (PairNetworks). An admin-only environment switcher allows toggling between development and production database endpoints without redeploying.

---

## 2. User Requirements

### 2.1 User Management

| ID | Requirement | Priority |
|----|-------------|----------|
| UR-001 | Users can register and log in with username/password | Must |
| UR-002 | An admin role can manage users (create, deactivate, reset password) | Must |
| UR-003 | Users have a display name and avatar/initials | Should |
| UR-004 | Session persistence — users stay logged in across browser sessions | Should |
| UR-005 | LDAP/Active Directory integration for intranet SSO | Could |

### 2.1a Admin Environment Switcher

| ID | Requirement | Priority |
|----|-------------|----------|
| UR-006 | Admin users can view the current database environment (Dev / Production) in the UI | Must |
| UR-007 | Admin users can switch between pre-configured database environments via an in-app toggle | Must |
| UR-008 | Environment switch triggers a confirmation dialog ("Switch to Production — are you sure?") | Must |
| UR-009 | The environment indicator is always visible in the app header (e.g., coloured badge: green = Production, orange = Development) | Must |
| UR-009a | Non-admin users can see which environment they are on but cannot switch | Should |
| UR-009b | Environment definitions (name, API base URL) are configured server-side via environment variables | Must |
| UR-009c | Switching environments reconnects the backend to the selected MySQL database and refreshes all frontend data | Must |
| UR-009d | The system logs environment switches in an audit trail (who, when, from, to) | Should |
| UR-009e | A **Local/Test** mode stores all data in-browser (localStorage/in-memory) with no backend required | Must |
| UR-009f | Local mode uses a mock user (auto-logged-in) so no authentication is needed | Must |
| UR-009g | Local mode badge is **Red** and labelled "LOCAL — Test Mode" to clearly distinguish it | Must |
| UR-009h | Local mode can be pre-loaded with seed/fixture data for repeatable testing | Should |
| UR-009i | Local mode data can be exported as JSON and imported back for test case sharing | Could |

### 2.2 Task Lists (Kanban Columns)

| ID | Requirement | Priority |
|----|-------------|----------|
| UR-010 | Default columns: **Unassigned**, **My Backlog**, **My In Progress**, **My Complete** | Must |
| UR-011 | Users see their own Backlog / In Progress / Complete columns filtered to their tasks | Must |
| UR-012 | The Unassigned column is shared — all users see the same pool of unassigned tasks | Must |
| UR-013 | Admins or project owners can create custom columns/lists per project | Could |
| UR-014 | Tasks can be reordered within a column via drag-and-drop | Must |
| UR-015 | Column order position is persisted per user | Should |

### 2.3 Task CRUD

| ID | Requirement | Priority |
|----|-------------|----------|
| UR-020 | Any user can create a new task (defaults to Unassigned) | Must |
| UR-021 | A task has: title, description (rich text), priority, due date, tags/labels | Must |
| UR-022 | A task tracks: created by, created at, assigned to, status, last updated | Must |
| UR-023 | Tasks can be edited inline or via a detail panel/modal | Must |
| UR-024 | Tasks can be archived (soft-delete) and restored | Must |
| UR-025 | Tasks display a coloured priority indicator (Urgent, High, Medium, Low) | Should |
| UR-026 | Tasks can have one or more tags/labels (user-defined, colour-coded) | Should |

### 2.4 Drag-and-Drop Assignment

| ID | Requirement | Priority |
|----|-------------|----------|
| UR-030 | Dragging a task from **Unassigned** → **My Backlog** or **My In Progress** triggers a confirmation dialog | Must |
| UR-031 | The confirmation dialog shows: task title, "This task will be assigned to you", and a notes text field | Must |
| UR-032 | Notes entered in the dialog are appended to the task's diary | Must |
| UR-033 | Dragging between a user's own columns (Backlog ↔ In Progress ↔ Complete) moves without confirmation | Must |
| UR-034 | Dragging a task back to Unassigned un-assigns it (with confirmation) | Should |
| UR-035 | Smooth drag-and-drop animations with visual drop-zone indicators | Should |

### 2.5 Task Diary / Activity Log

| ID | Requirement | Priority |
|----|-------------|----------|
| UR-040 | Each task has a chronological diary of notes | Must |
| UR-041 | Any user can add a note to any task they have access to | Must |
| UR-042 | Notes record: author, timestamp, text content | Must |
| UR-043 | Notes support basic rich text (bold, italic, bullet lists, links) | Should |
| UR-044 | System events are logged as diary entries (assigned, moved, status changed, etc.) | Must |
| UR-045 | Notes can be edited or deleted by the author within a time window (e.g., 15 minutes) | Could |

### 2.6 File Attachments & Google Drive Links

| ID | Requirement | Priority |
|----|-------------|----------|
| UR-050 | Users can upload file attachments to a task | Must |
| UR-051 | Attachments are stored on the server filesystem (inside the Docker volume) | Must |
| UR-052 | Common file types show previews (images, PDFs) | Should |
| UR-053 | Users can add Google Drive links to a task | Must |
| UR-054 | Google Drive links display with file name, type icon, and direct-open link | Should |
| UR-055 | Maximum attachment size is configurable (default 25 MB) | Should |
| UR-056 | Drag-and-drop file upload into the task detail view | Should |

### 2.7 Child Tasks (Sub-tasks)

| ID | Requirement | Priority |
|----|-------------|----------|
| UR-060 | A task can have zero or more child tasks | Must |
| UR-061 | Child tasks are full tasks — they can be assigned to different users | Must |
| UR-062 | Child tasks appear nested under the parent in the task detail view | Must |
| UR-063 | Parent task shows a progress indicator (e.g., 3/5 sub-tasks complete) | Must |
| UR-064 | A parent task cannot be marked complete until all child tasks are complete (configurable) | Should |
| UR-065 | Child tasks can themselves have children (max depth: 3 levels) | Could |
| UR-066 | Use case example: "Design bottle label" parent task with child tasks "Legal review", "Marketing review", "Print proof approval" assigned to respective team members | — |

### 2.8 Search & Filtering

| ID | Requirement | Priority |
|----|-------------|----------|
| UR-070 | Global search across task titles, descriptions, and diary notes | Must |
| UR-071 | Filter by: assignee, priority, tag, due date range, status | Must |
| UR-072 | Saved filters / views per user | Could |
| UR-073 | Keyboard shortcut to open search (Cmd/Ctrl + K) | Should |

### 2.9 Notifications

| ID | Requirement | Priority |
|----|-------------|----------|
| UR-080 | In-app notification bell with unread count | Must |
| UR-081 | Notify when: task assigned to you, child task completed, note added to your task, due date approaching | Must |
| UR-082 | Real-time updates — board refreshes when another user makes changes | Should |
| UR-083 | Optional email notifications (requires SMTP config) | Could |

### 2.10 Things-Inspired UX

| ID | Requirement | Priority |
|----|-------------|----------|
| UR-090 | Clean, minimal UI with generous whitespace (Things aesthetic) | Must |
| UR-091 | Sidebar navigation: Today, Upcoming, Anytime, Someday, Logbook (completed) | Should |
| UR-092 | "Today" view showing tasks due today or marked as today across all projects | Should |
| UR-093 | Quick-add task with natural language date parsing ("tomorrow", "next Friday") | Could |
| UR-094 | Keyboard-driven workflow — shortcuts for common actions | Should |
| UR-095 | Dark mode toggle | Could |

---

## 3. Technical Architecture

### 3.1 System Overview

```
┌──────────────────────────────────────────────────┐
│               Docker Container                   │
│                                                  │
│  ┌───────────┐    ┌──────────────┐               │
│  │  Nginx    │───▶│   Backend    │               │
│  │ (reverse  │    │  (Node.js /  │               │
│  │  proxy)   │    │   Express)   │               │
│  │ + serves  │    │              │  ┌──────────┐ │
│  │ frontend  │    │  REST API    │─▶│  File    │ │
│  │ static    │    │  + WebSocket │  │  Storage │ │
│  │ assets    │    │              │  │  (volume)│ │
│  └───────────┘    └──────┬───────┘  └──────────┘ │
│                          │                       │
└──────────────────────────┼───────────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼                         ▼
   ┌───────────────────┐   ┌───────────────────────┐
   │  DEV MySQL        │   │  PROD MySQL           │
   │  10.0.0.155:6663  │   │  PairNetworks Cloud   │
   │  (intranet)       │   │  (hosted)             │
   └───────────────────┘   └───────────────────────┘

   ◄── Admin toggle in UI selects active database ──►

   ┌──────────────────────────────────────────────┐
   │  LOCAL / TEST MODE (no backend required)     │
   │                                              │
   │  ┌────────────┐    ┌───────────────────────┐ │
   │  │  React App │───▶│  In-Memory Store      │ │
   │  │  (browser) │    │  (Zustand + optional  │ │
   │  │            │◀───│   localStorage)       │ │
   │  └────────────┘    └───────────────────────┘ │
   │                                              │
   │  - Mock auth (auto-login as test user)       │
   │  - All CRUD via local adapter                │
   │  - Seed data for repeatable tests            │
   │  - No network calls                          │
   └──────────────────────────────────────────────┘
```

### 3.2 Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | React 18 + TypeScript | Component ecosystem, strong typing |
| **UI Framework** | Tailwind CSS + shadcn/ui | Things-inspired clean aesthetic, rapid development |
| **Drag & Drop** | dnd-kit | Modern, accessible, performant DnD for React |
| **State Management** | Zustand or React Query | Lightweight, fits server-state-heavy app |
| **Backend** | Node.js + Express + TypeScript | Same language as frontend, strong ecosystem |
| **Database** | MySQL 8 (cloud-hosted, PairNetworks) | Existing hosting; relational integrity for task hierarchies; JSON column support |
| **ORM** | Prisma (mysql provider) | Type-safe queries, migrations, schema-as-code; supports dynamic datasource URLs for env switching |
| **Real-time** | Socket.IO | WebSocket with fallback for live board updates |
| **Auth** | JWT + bcrypt (with httpOnly cookies) | Stateless auth suitable for intranet |
| **File Storage** | Local filesystem (Docker volume) | Simple, no cloud dependency |
| **Containerisation** | Docker + Docker Compose | Single-command deployment |
| **Reverse Proxy** | Nginx | Serves static files, proxies API, handles compression |

### 3.3 Database Schema (Core Entities — MySQL)

> All IDs use `CHAR(36)` storing UUIDs generated application-side. This keeps
> IDs portable across dev/prod databases and avoids AUTO_INCREMENT conflicts
> when syncing data between environments.

```sql
users
  id              CHAR(36) PK                -- UUID generated app-side
  username        VARCHAR(100) UNIQUE
  email           VARCHAR(255) UNIQUE
  display_name    VARCHAR(100)
  password_hash   VARCHAR(255)
  role            ENUM('admin','user')
  avatar_url      VARCHAR(512) NULL
  created_at      DATETIME DEFAULT NOW()
  updated_at      DATETIME ON UPDATE NOW()

projects (future: grouping tasks)
  id              CHAR(36) PK
  name            VARCHAR(200)
  description     TEXT
  owner_id        CHAR(36) FK → users
  created_at      DATETIME DEFAULT NOW()

tasks
  id              CHAR(36) PK
  title           VARCHAR(500)
  description     TEXT                       -- rich text stored as HTML
  status          ENUM('unassigned','backlog','in_progress','complete','archived')
  priority        ENUM('urgent','high','medium','low')
  assigned_to     CHAR(36) FK → users NULL
  created_by      CHAR(36) FK → users
  parent_task_id  CHAR(36) FK → tasks NULL   -- self-referential
  project_id      CHAR(36) FK → projects NULL
  due_date        DATE NULL
  sort_order      INT
  created_at      DATETIME DEFAULT NOW()
  updated_at      DATETIME ON UPDATE NOW()
  INDEX idx_status (status)
  INDEX idx_assigned (assigned_to)
  INDEX idx_parent (parent_task_id)
  FULLTEXT idx_search (title, description)

task_notes (diary)
  id              CHAR(36) PK
  task_id         CHAR(36) FK → tasks
  author_id       CHAR(36) FK → users
  content         TEXT
  is_system       TINYINT(1) DEFAULT 0       -- 1 = auto-generated entry
  created_at      DATETIME DEFAULT NOW()
  updated_at      DATETIME ON UPDATE NOW()
  FULLTEXT idx_note_search (content)

task_attachments
  id              CHAR(36) PK
  task_id         CHAR(36) FK → tasks
  uploaded_by     CHAR(36) FK → users
  file_name       VARCHAR(255)
  file_path       VARCHAR(512)
  file_size       BIGINT
  mime_type       VARCHAR(100)
  created_at      DATETIME DEFAULT NOW()

task_links
  id              CHAR(36) PK
  task_id         CHAR(36) FK → tasks
  url             VARCHAR(2048)
  link_type       ENUM('google_drive','external','other')
  display_name    VARCHAR(255)
  added_by        CHAR(36) FK → users
  created_at      DATETIME DEFAULT NOW()

task_tags
  id              CHAR(36) PK
  name            VARCHAR(50)
  colour          VARCHAR(7)                 -- hex colour e.g. #FF5733

task_tag_assignments
  task_id         CHAR(36) FK → tasks
  tag_id          CHAR(36) FK → task_tags
  PRIMARY KEY (task_id, tag_id)

notifications
  id              CHAR(36) PK
  user_id         CHAR(36) FK → users
  task_id         CHAR(36) FK → tasks NULL
  type            VARCHAR(50)
  message         TEXT
  is_read         TINYINT(1) DEFAULT 0
  created_at      DATETIME DEFAULT NOW()
  INDEX idx_user_unread (user_id, is_read)

environment_audit_log
  id              CHAR(36) PK
  user_id         CHAR(36) FK → users
  switched_from   VARCHAR(50)                -- e.g. 'development'
  switched_to     VARCHAR(50)                -- e.g. 'production'
  created_at      DATETIME DEFAULT NOW()
```

### 3.4 API Design (Key Endpoints)

```
Auth
  POST   /api/auth/register
  POST   /api/auth/login
  POST   /api/auth/logout
  GET    /api/auth/me

Users
  GET    /api/users
  GET    /api/users/:id
  PATCH  /api/users/:id

Tasks
  GET    /api/tasks                    (with query filters)
  POST   /api/tasks
  GET    /api/tasks/:id
  PATCH  /api/tasks/:id
  DELETE /api/tasks/:id                (soft delete / archive)
  PATCH  /api/tasks/:id/assign         (assign to user)
  PATCH  /api/tasks/:id/move           (change status + sort order)
  GET    /api/tasks/:id/children

Task Diary
  GET    /api/tasks/:id/notes
  POST   /api/tasks/:id/notes
  PATCH  /api/tasks/:id/notes/:noteId
  DELETE /api/tasks/:id/notes/:noteId

Attachments
  POST   /api/tasks/:id/attachments    (multipart upload)
  GET    /api/tasks/:id/attachments
  DELETE /api/tasks/:id/attachments/:attachmentId
  GET    /api/attachments/:id/download

Links
  POST   /api/tasks/:id/links
  DELETE /api/tasks/:id/links/:linkId

Tags
  GET    /api/tags
  POST   /api/tags
  PATCH  /api/tags/:id
  DELETE /api/tags/:id

Notifications
  GET    /api/notifications
  PATCH  /api/notifications/:id/read
  POST   /api/notifications/read-all

Environment (admin only)
  GET    /api/environment                  (current env name + available envs)
  POST   /api/environment/switch           (body: { target: "production" })
  GET    /api/environment/audit-log        (history of switches)

WebSocket Events
  board:updated        (task created/moved/updated)
  notification:new     (new notification for user)
  task:typing          (someone is editing a task)
  environment:switched (all clients reload data after env switch)
```

### 3.5 Environment Switcher — How It Works

The environment switcher lets admins toggle the **entire application** between
database backends (e.g., dev vs. production) without restarting the container.
A third **Local/Test** mode runs entirely in the browser with no backend at all.

#### 3.5.1 Remote Modes (Development / Production / Staging)

**Backend mechanics:**

1. On startup, the backend reads all `DB_*_URL` environment variables and
   builds a registry of named environments:
   ```
   DB_DEV_URL  → { name: "development", url: "mysql://...@10.0.0.155:6663/ontoit_dev" }
   DB_PROD_URL → { name: "production",  url: "mysql://...@pairnetworks.example/ontoit" }
   ```
2. A Prisma client is instantiated for the `DEFAULT_ENV` on boot.
3. When an admin hits `POST /api/environment/switch { target: "production" }`:
   - The backend validates the target exists and the user is an admin.
   - The current Prisma client is disconnected (`$disconnect()`).
   - A new Prisma client is created with the target's connection URL.
   - A WebSocket event `environment:switched` is broadcast to all clients.
   - An audit log entry is written to the **new** database.
4. All subsequent API requests use the new Prisma client.

#### 3.5.2 Local/Test Mode (In-Browser, No Backend)

Local mode is designed for **unit testing, UI development, and demos** — the
entire data layer runs in the browser with zero network calls.

**Architecture — Data Adapter Pattern:**

The frontend uses a `DataAdapter` interface that abstracts all data operations.
Two implementations exist:

```typescript
interface DataAdapter {
  getTasks(filters?: TaskFilters): Promise<Task[]>
  createTask(task: CreateTaskInput): Promise<Task>
  updateTask(id: string, updates: Partial<Task>): Promise<Task>
  moveTask(id: string, status: Status, sortOrder: number): Promise<Task>
  // ... all CRUD operations for tasks, notes, attachments, etc.
}

class ApiAdapter implements DataAdapter {
  // Calls REST API endpoints (used in dev/prod modes)
}

class LocalAdapter implements DataAdapter {
  // Reads/writes to Zustand store backed by localStorage
  // UUID generation via crypto.randomUUID()
  // No auth required — uses a hardcoded test user
}
```

**How it works:**

1. When the admin selects "Local/Test" mode (or the app is loaded with
   `?mode=local` query parameter), the frontend:
   - Swaps the active `DataAdapter` to `LocalAdapter`
   - Bypasses all authentication (auto-logged-in as "Test User", role: admin)
   - Disables WebSocket connections
   - Loads seed data if the local store is empty (or on demand via a button)

2. **Data storage:**
   - Primary: Zustand in-memory store (fast, reactive)
   - Persistence: `localStorage` so data survives page refreshes
   - Seed data: A `seedData.ts` file with representative fixtures (sample
     tasks, notes, tags, sub-tasks) for repeatable testing

3. **File attachments in local mode:**
   - Stored as base64 data URLs in localStorage (with a size warning)
   - Or simply stored as metadata stubs (filename, size) without actual content

4. **Testing benefits:**
   - Unit tests can instantiate `LocalAdapter` directly — no API mocking needed
   - Playwright/Cypress E2E tests can use `?mode=local` for fast, deterministic runs
   - Developers can work on the frontend without running Docker or having DB access
   - Seed data resets with a single button click for repeatable demos

**Frontend mechanics (all modes):**

1. The app header displays an environment badge (colour-coded):
   - **Green** = Production
   - **Orange** = Development
   - **Blue** = Staging (if configured)
   - **Red** = Local/Test Mode
2. Admins see a dropdown arrow on the badge → selects target → confirmation
   dialog → API call (or local swap) → all data reloads automatically.
3. Non-admin users see the badge (read-only) and receive a toast notification
   when the environment changes.

**Important considerations:**

- Both remote databases must have the **same schema version** — Prisma
  migrations should be run against all environments before switching.
- User accounts are **per-database** — switching environment may require
  re-authentication if the user doesn't exist in the target DB.
- File attachments are stored locally (not in MySQL), so they persist across
  environment switches. Attachment references in the DB may not match across
  environments.

---

## 4. Project Phases & Development Plan

### Phase 1 — Foundation (Weeks 1–2)

**Goal:** Running app skeleton with auth and basic task CRUD.

| # | Task | Est. |
|---|------|------|
| 1.1 | Set up monorepo structure (`/frontend`, `/backend`, `/docker`) | 2h |
| 1.2 | Docker Compose: Node backend + Nginx + frontend build (no local DB — uses remote MySQL) | 3h |
| 1.3 | Backend: Express + TypeScript boilerplate, Prisma (mysql provider), DB schema migration against dev MySQL | 4h |
| 1.3a | Backend: Environment manager — load multiple DB connection configs, admin toggle endpoint, Prisma client hot-swap | 4h |
| 1.4 | Backend: User registration & login (JWT, bcrypt, httpOnly cookies) | 4h |
| 1.5 | Backend: Task CRUD API (create, read, update, archive) | 4h |
| 1.6 | Frontend: React + TypeScript + Vite + Tailwind + shadcn/ui setup | 3h |
| 1.6a | Frontend: DataAdapter interface + ApiAdapter + LocalAdapter implementations | 4h |
| 1.6b | Frontend: Seed data fixtures (`seedData.ts`) with sample tasks, notes, tags | 2h |
| 1.6c | Frontend: `?mode=local` query param support + local mode auto-login | 2h |
| 1.7 | Frontend: Login/Register pages | 3h |
| 1.8 | Frontend: Basic board view — 4 columns, task cards rendered from API | 4h |
| 1.9 | End-to-end smoke test: register → login → create task → see on board | 2h |

**Deliverable:** Users can register, log in, and see tasks on a static (non-draggable) board.

---

### Phase 2 — Drag & Drop + Assignment (Weeks 3–4)

**Goal:** Full Kanban interaction with assignment confirmation flow.

| # | Task | Est. |
|---|------|------|
| 2.1 | Integrate dnd-kit for drag-and-drop between columns | 6h |
| 2.2 | Backend: `/tasks/:id/move` endpoint (status change + reorder) | 3h |
| 2.3 | Assignment confirmation dialog (Unassigned → Backlog/InProgress) | 4h |
| 2.4 | Persist sort order within columns | 3h |
| 2.5 | Un-assign flow: drag back to Unassigned with confirmation | 2h |
| 2.6 | Visual polish: drop zone highlighting, drag preview, animations | 4h |
| 2.7 | Multi-user board view: show other users' tasks (read-only) or shared Unassigned | 3h |

**Deliverable:** Full drag-and-drop board with assignment dialogs and smooth UX.

---

### Phase 3 — Task Detail, Diary & Notes (Weeks 5–6)

**Goal:** Rich task detail panel with activity diary.

| # | Task | Est. |
|---|------|------|
| 3.1 | Task detail slide-out panel or modal | 4h |
| 3.2 | Editable fields: title, description (rich text editor — Tiptap), priority, due date, tags | 6h |
| 3.3 | Task diary/notes: display chronological list | 3h |
| 3.4 | Add note form with rich text | 3h |
| 3.5 | System-generated diary entries (assigned, moved, created, etc.) | 3h |
| 3.6 | Tags CRUD + tag assignment UI with colour picker | 3h |
| 3.7 | Priority indicator + due date display on task cards | 2h |

**Deliverable:** Click any task card → rich detail view with diary and editable fields.

---

### Phase 4 — Attachments & Google Drive Links (Week 7)

**Goal:** File upload and external link management.

| # | Task | Est. |
|---|------|------|
| 4.1 | Backend: File upload endpoint (multer), storage in Docker volume | 3h |
| 4.2 | Backend: Download/serve endpoint with auth check | 2h |
| 4.3 | Frontend: Drag-and-drop file upload zone in task detail | 3h |
| 4.4 | Attachment list with file type icons, size, download link | 2h |
| 4.5 | Image/PDF preview in-line | 3h |
| 4.6 | Google Drive link adding — URL input with validation | 2h |
| 4.7 | Google Drive link display with icon and open-in-new-tab | 1h |
| 4.8 | Configurable max upload size via environment variable | 1h |

**Deliverable:** Tasks support file attachments and Google Drive links.

---

### Phase 5 — Child Tasks / Sub-tasks (Week 8)

**Goal:** Hierarchical task relationships.

| # | Task | Est. |
|---|------|------|
| 5.1 | Backend: parent_task_id relationship, children endpoint | 3h |
| 5.2 | UI: "Add sub-task" button in task detail | 2h |
| 5.3 | Sub-task list in parent task detail (nested, collapsible) | 3h |
| 5.4 | Sub-tasks appear on the board as independent cards with parent indicator | 2h |
| 5.5 | Parent progress indicator (e.g., "2/4 sub-tasks complete") | 2h |
| 5.6 | Optional: block parent completion until children are done | 2h |
| 5.7 | Sub-task assignment to different users | 1h |

**Deliverable:** Full parent-child task hierarchy with progress tracking.

---

### Phase 6 — Real-time & Notifications (Week 9)

**Goal:** Live updates and in-app notifications.

| # | Task | Est. |
|---|------|------|
| 6.1 | Socket.IO integration on backend | 3h |
| 6.2 | Frontend WebSocket connection + reconnection handling | 2h |
| 6.3 | Live board updates: task created/moved/updated broadcasts | 3h |
| 6.4 | Notification model + backend logic (assignment, notes, due dates) | 3h |
| 6.5 | Notification bell UI with unread count and dropdown list | 3h |
| 6.6 | Mark as read / mark all as read | 1h |
| 6.7 | Conflict handling: if two users drag the same task simultaneously | 2h |

**Deliverable:** Multi-user real-time collaboration with notifications.

---

### Phase 7 — Things-Inspired Views & Search (Week 10)

**Goal:** Sidebar navigation, smart views, global search.

| # | Task | Est. |
|---|------|------|
| 7.1 | Sidebar: Today, Upcoming, Anytime, Someday, Logbook navigation | 4h |
| 7.2 | "Today" view: tasks due today or flagged for today | 3h |
| 7.3 | "Upcoming" view: calendar-style grouped by date | 3h |
| 7.4 | "Logbook" view: completed tasks archive | 2h |
| 7.5 | Global search (Cmd/Ctrl+K) with full-text search | 4h |
| 7.6 | Filter bar: by assignee, priority, tag, date range | 3h |
| 7.7 | Keyboard shortcuts for power users | 3h |

**Deliverable:** Full Things-inspired navigation with search and filtering.

---

### Phase 8 — Polish, Admin & Deployment (Weeks 11–12)

**Goal:** Production-ready deployment.

| # | Task | Est. |
|---|------|------|
| 8.1 | Admin panel: user management (create, deactivate, password reset) | 4h |
| 8.2 | Responsive design for tablet/mobile | 4h |
| 8.3 | Dark mode toggle | 3h |
| 8.4 | Error handling, loading states, empty states throughout | 3h |
| 8.5 | Rate limiting, input validation, security hardening | 3h |
| 8.6 | Production Docker Compose: health checks, restart policies, logging | 3h |
| 8.7 | Backup strategy: mysqldump cron script + PairNetworks backup integration | 2h |
| 8.8 | Environment variable documentation | 1h |
| 8.9 | User guide / help page | 3h |
| 8.10 | Performance: query optimisation, frontend bundle analysis | 3h |
| 8.11 | End-to-end testing suite (Playwright) | 4h |

**Deliverable:** Production-ready Docker image deployable on intranet.

---

## 5. Docker Deployment Architecture

```yaml
# docker-compose.yml (simplified)
services:
  backend:
    build: ./backend
    volumes:
      - uploads:/app/uploads
    environment:
      # Default (active on startup) environment
      DEFAULT_ENV: development

      # Development MySQL (e.g., local intranet server)
      DB_DEV_URL: mysql://ontoit:${DB_DEV_PASSWORD}@10.0.0.155:6663/ontoit_dev

      # Production MySQL (PairNetworks cloud)
      DB_PROD_URL: mysql://ontoit:${DB_PROD_PASSWORD}@mysql-prod.pairnetworks.example/ontoit

      JWT_SECRET: ${JWT_SECRET}
      MAX_UPLOAD_SIZE: ${MAX_UPLOAD_SIZE:-25mb}

  frontend:
    build: ./frontend
    # Built as static files, served by nginx

  nginx:
    image: nginx:alpine
    ports:
      - "${PORT:-80}:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - frontend_build:/usr/share/nginx/html

volumes:
  uploads:
  frontend_build:
```

> **Note:** No local database container — both dev and prod databases are
> remote MySQL instances. The backend dynamically connects to whichever
> environment the admin has selected.

**Deployment:** `docker compose up -d` on any intranet server.

---

## 6. Configuration (Environment Variables)

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | External port | `80` |
| `DEFAULT_ENV` | Environment active on startup | `development` |
| `DB_DEV_URL` | Dev MySQL connection string (e.g., `mysql://user:pass@10.0.0.155:6663/ontoit_dev`) | (required) |
| `DB_PROD_URL` | Prod MySQL connection string (e.g., `mysql://user:pass@host/ontoit`) | (required) |
| `JWT_SECRET` | Secret for signing tokens | (required) |
| `MAX_UPLOAD_SIZE` | Max file attachment size | `25mb` |
| `SESSION_EXPIRY` | JWT token expiry | `7d` |
| `SMTP_HOST` | Email server for notifications | (optional) |
| `SMTP_PORT` | Email server port | `587` |
| `SMTP_USER` | Email credentials | (optional) |
| `SMTP_PASS` | Email credentials | (optional) |
| `ADMIN_EMAIL` | Initial admin account email | (optional) |

> **Adding more environments:** The system reads all `DB_*_URL` variables at
> startup. To add a staging environment, simply set `DB_STAGING_URL` — it will
> appear in the admin switcher automatically.

---

## 7. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | Board loads in < 2s with 500+ tasks |
| **Scalability** | Supports 50 concurrent users on a single server |
| **Availability** | Docker restart policy `unless-stopped`; remote MySQL handles DB persistence |
| **Security** | Passwords hashed with bcrypt (cost 12); JWT in httpOnly cookies; CSRF protection; input sanitisation; rate limiting on auth endpoints; DB credentials encrypted at rest in env vars; TLS for production MySQL connection |
| **Backup** | MySQL backups managed via PairNetworks hosting tools + optional mysqldump cron; upload directory backed up from Docker volume |
| **Browser Support** | Chrome, Firefox, Edge (latest 2 versions); Safari (latest) |
| **Accessibility** | WCAG 2.1 AA for keyboard navigation and screen readers |
| **Data** | Task data stored in cloud MySQL (PairNetworks); file attachments stored locally in Docker volume; no other external service calls except optional Google Drive link validation |

---

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Drag-and-drop conflicts with concurrent users | Medium | Optimistic UI + server-side ordering authority + WebSocket sync |
| File storage filling up | Medium | Configurable upload limit; monitoring; admin dashboard shows storage usage |
| Single container = single point of failure | Low (intranet) | Docker restart policy; daily backups; documented recovery procedure |
| Cloud MySQL unavailable (network/hosting outage) | Medium | Connection retry with backoff; clear "DB unreachable" banner in UI; dev DB as fallback |
| Admin accidentally switches to wrong environment | Medium | Confirmation dialog with environment name; coloured badge always visible; audit log |
| Data divergence between dev and prod databases | Low | Environments are intentionally separate; schema migrations run against both; no auto-sync |
| Google Drive links break if permissions change | Low | Links are just references; display warning if unreachable |
| Scope creep from user requests | High | Phased delivery; MoSCoW priorities; get sign-off per phase |

---

## 9. Future Enhancements (Post-MVP)

- **Projects/Workspaces** — group tasks into projects with their own boards
- **LDAP/AD integration** — SSO for corporate intranet
- **Recurring tasks** — auto-create tasks on a schedule
- **Time tracking** — log time spent per task
- **API webhooks** — integrate with Slack, Teams, etc.
- **Gantt chart view** — for timeline planning
- **Mobile PWA** — installable app for phones/tablets
- **Bulk operations** — multi-select tasks for batch actions
- **Import/Export** — CSV, Trello JSON import

---

## 10. Success Criteria

1. Users can create, assign, and complete tasks via drag-and-drop within 3 clicks
2. Assignment confirmation dialog fires correctly with note capture
3. Sub-tasks track progress and support cross-user assignment
4. File attachments and Google Drive links are accessible from task detail
5. Board updates in real-time for all connected users
6. System deploys with a single `docker compose up -d` command
7. All data remains on the intranet — no external dependencies for core functionality
