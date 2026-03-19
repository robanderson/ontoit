import { useAppStore } from '../../store/useAppStore';
import type { TaskStatus } from '../../types';

const columnConfig: Record<string, { title: string; color: string }> = {
  unassigned: { title: 'Unassigned', color: 'var(--color-text-tertiary)' },
  backlog: { title: 'My Backlog', color: 'var(--color-brand-500)' },
  in_progress: { title: 'In Progress', color: 'var(--color-env-development)' },
  complete: { title: 'Complete', color: 'var(--color-env-production)' },
};

interface CollapsedColumnProps {
  status: TaskStatus;
  count: number;
}

export function CollapsedColumn({ status, count }: CollapsedColumnProps) {
  const { toggleColumnVisibility } = useAppStore();
  const config = columnConfig[status] ?? { title: status, color: 'gray' };

  return (
    <button
      onClick={() => toggleColumnVisibility(status)}
      className="flex flex-col items-center gap-2 py-4 px-1 rounded-xl bg-[var(--color-surface-secondary)] hover:bg-[var(--color-surface-tertiary)] transition-colors cursor-pointer min-h-[200px] w-10 shrink-0"
      title={`Show ${config.title} (${count})`}
    >
      <div
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: config.color }}
      />
      <span className="text-xs text-[var(--color-text-tertiary)] bg-[var(--color-surface-tertiary)] px-1.5 py-0.5 rounded-full">
        {count}
      </span>
      <span
        className="text-xs font-medium text-[var(--color-text-tertiary)]"
        style={{ writingMode: 'vertical-lr', textOrientation: 'mixed' }}
      >
        {config.title}
      </span>
    </button>
  );
}
