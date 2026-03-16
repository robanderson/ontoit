import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Task, TaskStatus } from '../../types';
import { TaskCard } from './TaskCard';

const columnConfig: Record<string, { title: string; emptyText: string; headerColor: string }> = {
  unassigned: { title: 'Unassigned', emptyText: 'No unassigned tasks', headerColor: 'var(--color-text-tertiary)' },
  backlog: { title: 'My Backlog', emptyText: 'Backlog is empty', headerColor: 'var(--color-brand-500)' },
  in_progress: { title: 'In Progress', emptyText: 'Nothing in progress', headerColor: 'var(--color-env-development)' },
  complete: { title: 'Complete', emptyText: 'No completed tasks', headerColor: 'var(--color-env-production)' },
};

interface ColumnProps {
  status: TaskStatus;
  tasks: Task[];
}

export function Column({ status, tasks }: ColumnProps) {
  const config = columnConfig[status] ?? { title: status, emptyText: 'No tasks', headerColor: 'gray' };
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex-1 min-w-[280px] max-w-[340px] flex flex-col">
      {/* Column Header */}
      <div className="flex items-center gap-2 px-2 pb-3">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: config.headerColor }} />
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{config.title}</h2>
        <span className="text-xs text-[var(--color-text-tertiary)] bg-[var(--color-surface-tertiary)] px-1.5 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 flex flex-col gap-2 p-2 rounded-xl transition-colors min-h-[200px] ${
          isOver ? 'bg-[var(--color-brand-50)] border-2 border-dashed border-[var(--color-brand-200)]' : 'bg-[var(--color-surface-secondary)]'
        }`}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-[var(--color-text-tertiary)]">{config.emptyText}</p>
          </div>
        )}
      </div>
    </div>
  );
}
