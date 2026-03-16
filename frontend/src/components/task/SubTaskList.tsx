import { CheckCircle2, Circle, Flag } from 'lucide-react';
import type { Task } from '../../types';
import { useAppStore } from '../../store/useAppStore';

const priorityColors: Record<string, string> = {
  urgent: 'var(--color-priority-urgent)',
  high: 'var(--color-priority-high)',
  medium: 'var(--color-priority-medium)',
  low: 'var(--color-priority-low)',
};

interface SubTaskListProps {
  tasks: Task[];
}

export function SubTaskList({ tasks }: SubTaskListProps) {
  const { selectTask, updateTask, users } = useAppStore();

  if (tasks.length === 0) {
    return <p className="text-xs text-[var(--color-text-tertiary)] ml-1">No sub-tasks yet.</p>;
  }

  const toggleComplete = async (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    const newStatus = task.status === 'complete' ? 'backlog' : 'complete';
    await updateTask(task.id, { status: newStatus });
  };

  return (
    <div className="space-y-1">
      {tasks.map(task => {
        const assignee = task.assignedTo ? users.find(u => u.id === task.assignedTo) : null;
        const done = task.status === 'complete';
        return (
          <div
            key={task.id}
            onClick={() => selectTask(task.id)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[var(--color-surface-secondary)] cursor-pointer group"
          >
            <button onClick={(e) => toggleComplete(e, task)} className="shrink-0">
              {done ? (
                <CheckCircle2 size={16} className="text-[var(--color-env-production)]" />
              ) : (
                <Circle size={16} className="text-[var(--color-text-tertiary)] group-hover:text-[var(--color-text-secondary)]" />
              )}
            </button>
            <Flag size={11} style={{ color: priorityColors[task.priority] }} className="shrink-0" />
            <span className={`text-sm flex-1 truncate ${done ? 'line-through text-[var(--color-text-tertiary)]' : 'text-[var(--color-text-primary)]'}`}>
              {task.title}
            </span>
            {assignee && (
              <div className="w-4 h-4 rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-600)] flex items-center justify-center text-[9px] font-medium shrink-0">
                {assignee.displayName.charAt(0)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
