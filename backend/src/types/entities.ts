// Shared entity types — mirrors frontend/src/types/index.ts
// These will eventually be extracted to a shared package.

export type TaskStatus = 'unassigned' | 'backlog' | 'in_progress' | 'complete' | 'archived';
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';
export type UserRole = 'admin' | 'user' | 'agent';

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  isAgent?: boolean;
  apiKey?: string;
  requiresApproval?: boolean;
  approverUserId?: string | null;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo: string | null;
  createdBy: string;
  parentTaskId: string | null;
  dueDate: string | null;
  sortOrder: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskNote {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  isSystem: boolean;
  createdAt: string;
}

export interface TaskLink {
  id: string;
  taskId: string;
  url: string;
  linkType: 'google_drive' | 'external' | 'other';
  displayName: string;
  addedBy: string;
  createdAt: string;
}

export interface Tag {
  id: string;
  name: string;
  colour: string;
}

export interface MaterialisedState {
  tasks: Task[];
  tags: Tag[];
  notes: TaskNote[];
  links: TaskLink[];
  users: User[];
}
