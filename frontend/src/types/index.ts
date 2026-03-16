export type TaskStatus = 'unassigned' | 'backlog' | 'in_progress' | 'complete' | 'archived';
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';
export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
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

export interface TaskAttachment {
  id: string;
  taskId: string;
  uploadedBy: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  dataUrl?: string; // for local mode
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

export type EnvironmentMode = 'local' | 'development' | 'production' | 'staging';

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  parentTaskId?: string | null;
  dueDate?: string | null;
  tags?: string[];
}

export interface TaskFilters {
  status?: TaskStatus[];
  assignedTo?: string | null;
  priority?: TaskPriority[];
  search?: string;
  parentTaskId?: string | null;
}
