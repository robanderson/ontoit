# OnToIt — Multi-User Task Management System

## Project Plan & User Requirements Specification

---

## 1. Vision & Overview

**OnToIt** is a self-hosted, intranet-based task management application inspired by **Things** and **Trello**. It provides a drag-and-drop Kanban-style interface for managing tasks across teams, with support for task hierarchies (parent/child), file attachments, Google Drive links, and a running diary of notes per task.

The system runs in a Docker container, serves a web UI, and requires no external cloud dependencies beyond optional Google Drive integration.

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
┌──────────────────────────────────────────────────────┐
│                  Docker Container                    │
│                                                      │
│  ┌─────────────┐    ┌─────────────┐   ┌───────────┐ │
│  │   Nginx     │───▶│  Backend    │──▶│ PostgreSQL│ │
│  │  (reverse   │    │  (Node.js / │   │  Database │ │
│  │   proxy)    │    │   Express)  │   │           │ │
│  │  + serves   │    │             │   └───────────┘ │
│  │  frontend   │    │  REST API   │                  │
│  │  static     │    │  + WebSocket│   ┌───────────┐ │
│  │  assets     │    │             │──▶│  File     │ │
│  └─────────────┘    └─────────────┘   │  Storage  │ │
│                                       │  (volume) │ │
│                                       └───────────┘ │
└──────────────────────────────────────────────────────┘
```

### 3.2 Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | React 18 + TypeScript | Component ecosystem, strong typing |
| **UI Framework** | Tailwind CSS + shadcn/ui | Things-inspired clean aesthetic, rapid development |
| **Drag & Drop** | dnd-kit | Modern, accessible, performant DnD for React |
| **State Management** | Zustand or React Query | Lightweight, fits server-state-heavy app |
| **Backend** | Node.js + Express + TypeScript | Same language as frontend, strong ecosystem |
| **Database** | PostgreSQL 16 | Relational integrity for task hierarchies, JSONB for flexibility |
| **ORM** | Prisma | Type-safe queries, migrations, schema-as-code |
| **Real-time** | Socket.IO | WebSocket with fallback for live board updates |
| **Auth** | JWT + bcrypt (with httpOnly cookies) | Stateless auth suitable for intranet |
| **File Storage** | Local filesystem (Docker volume) | Simple, no cloud dependency |
| **Containerisation** | Docker + Docker Compose | Single-command deployment |
| **Reverse Proxy** | Nginx | Serves static files, proxies API, handles compression |

### 3.3 Database Schema (Core Entities)

```
users
  id              UUID PK
  username        VARCHAR UNIQUE
  email           VARCHAR UNIQUE
  display_name    VARCHAR
  password_hash   VARCHAR
  role            ENUM(admin, user)
  avatar_url      VARCHAR NULL
  created_at      TIMESTAMP
  updated_at      TIMESTAMP

projects (future: grouping tasks)
  id              UUID PK
  name            VARCHAR
  description     TEXT
  owner_id        UUID FK → users
  created_at      TIMESTAMP

tasks
  id              UUID PK
  title           VARCHAR
  description     TEXT (rich text as HTML/Markdown)
  status          ENUM(unassigned, backlog, in_progress, complete, archived)
  priority        ENUM(urgent, high, medium, low)
  assigned_to     UUID FK → users NULL
  created_by      UUID FK → users
  parent_task_id  UUID FK → tasks NULL (self-referential)
  project_id      UUID FK → projects NULL
  due_date        DATE NULL
  sort_order      INTEGER
  created_at      TIMESTAMP
  updated_at      TIMESTAMP

task_notes (diary)
  id              UUID PK
  task_id         UUID FK → tasks
  author_id       UUID FK → users
  content         TEXT
  is_system       BOOLEAN (true for auto-generated entries)
  created_at      TIMESTAMP
  updated_at      TIMESTAMP

task_attachments
  id              UUID PK
  task_id         UUID FK → tasks
  uploaded_by     UUID FK → users
  file_name       VARCHAR
  file_path       VARCHAR
  file_size       BIGINT
  mime_type       VARCHAR
  created_at      TIMESTAMP

task_links
  id              UUID PK
  task_id         UUID FK → tasks
  url             VARCHAR
  link_type       ENUM(google_drive, external, other)
  display_name    VARCHAR
  added_by        UUID FK → users
  created_at      TIMESTAMP

task_tags
  id              UUID PK
  name            VARCHAR
  colour          VARCHAR

task_tag_assignments
  task_id         UUID FK → tasks
  tag_id          UUID FK → task_tags
  PK(task_id, tag_id)

notifications
  id              UUID PK
  user_id         UUID FK → users
  task_id         UUID FK → tasks NULL
  type            VARCHAR
  message         TEXT
  read            BOOLEAN DEFAULT false
  created_at      TIMESTAMP
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

WebSocket Events
  board:updated        (task created/moved/updated)
  notification:new     (new notification for user)
  task:typing          (someone is editing a task)
```

---

## 4. Project Phases & Development Plan

### Phase 1 — Foundation (Weeks 1–2)

**Goal:** Running app skeleton with auth and basic task CRUD.

| # | Task | Est. |
|---|------|------|
| 1.1 | Set up monorepo structure (`/frontend`, `/backend`, `/docker`) | 2h |
| 1.2 | Docker Compose: PostgreSQL + Node backend + Nginx + frontend build | 4h |
| 1.3 | Backend: Express + TypeScript boilerplate, Prisma setup, DB schema migration | 4h |
| 1.4 | Backend: User registration & login (JWT, bcrypt, httpOnly cookies) | 4h |
| 1.5 | Backend: Task CRUD API (create, read, update, archive) | 4h |
| 1.6 | Frontend: React + TypeScript + Vite + Tailwind + shadcn/ui setup | 3h |
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
| 8.7 | Backup strategy: PostgreSQL pg_dump cron script | 2h |
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
  db:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: ontoit
      POSTGRES_USER: ontoit
      POSTGRES_PASSWORD: ${DB_PASSWORD}

  backend:
    build: ./backend
    depends_on: [db]
    volumes:
      - uploads:/app/uploads
    environment:
      DATABASE_URL: postgresql://ontoit:${DB_PASSWORD}@db:5432/ontoit
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
  pgdata:
  uploads:
  frontend_build:
```

**Deployment:** `docker compose up -d` on any intranet server.

---

## 6. Configuration (Environment Variables)

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | External port | `80` |
| `DB_PASSWORD` | PostgreSQL password | (required) |
| `JWT_SECRET` | Secret for signing tokens | (required) |
| `MAX_UPLOAD_SIZE` | Max file attachment size | `25mb` |
| `SESSION_EXPIRY` | JWT token expiry | `7d` |
| `SMTP_HOST` | Email server for notifications | (optional) |
| `SMTP_PORT` | Email server port | `587` |
| `SMTP_USER` | Email credentials | (optional) |
| `SMTP_PASS` | Email credentials | (optional) |
| `ADMIN_EMAIL` | Initial admin account email | (optional) |

---

## 7. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | Board loads in < 2s with 500+ tasks |
| **Scalability** | Supports 50 concurrent users on a single server |
| **Availability** | Docker restart policy `unless-stopped`; DB volume persistence |
| **Security** | Passwords hashed with bcrypt (cost 12); JWT in httpOnly cookies; CSRF protection; input sanitisation; rate limiting on auth endpoints |
| **Backup** | Automated daily DB dump to mounted volume; upload directory included in backup |
| **Browser Support** | Chrome, Firefox, Edge (latest 2 versions); Safari (latest) |
| **Accessibility** | WCAG 2.1 AA for keyboard navigation and screen readers |
| **Data** | All data stays on-premises; no external service calls except optional Google Drive link validation |

---

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Drag-and-drop conflicts with concurrent users | Medium | Optimistic UI + server-side ordering authority + WebSocket sync |
| File storage filling up | Medium | Configurable upload limit; monitoring; admin dashboard shows storage usage |
| Single container = single point of failure | Low (intranet) | Docker restart policy; daily backups; documented recovery procedure |
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
