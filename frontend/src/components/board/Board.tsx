import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import type { Task, TaskStatus } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { Column } from './Column';
import { CollapsedColumn } from './CollapsedColumn';
import { TaskCard } from './TaskCard';
import { AssignDialog } from './AssignDialog';

const COLUMNS: TaskStatus[] = ['unassigned', 'backlog', 'in_progress', 'complete'];

interface PendingAssign {
  task: Task;
  targetStatus: TaskStatus;
}

export function Board() {
  const { tasks, currentUser, moveTask, addNote, columnVisibility } = useAppStore();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [pendingAssign, setPendingAssign] = useState<PendingAssign | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Group top-level tasks by status (hide child tasks from columns — they show in detail panel)
  const tasksByStatus: Record<TaskStatus, Task[]> = {
    unassigned: [],
    backlog: [],
    in_progress: [],
    complete: [],
    archived: [],
  };

  for (const task of tasks) {
    if (task.status !== 'archived') {
      tasksByStatus[task.status].push(task);
    }
  }

  // Filter backlog/in_progress/complete to current user
  if (currentUser) {
    tasksByStatus.backlog = tasksByStatus.backlog.filter(t => t.assignedTo === currentUser.id);
    tasksByStatus.in_progress = tasksByStatus.in_progress.filter(t => t.assignedTo === currentUser.id);
    tasksByStatus.complete = tasksByStatus.complete.filter(t => t.assignedTo === currentUser.id);
  }

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    setActiveTask(task ?? null);
  }, [tasks]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const task = tasks.find(t => t.id === active.id);
    if (!task) return;

    // Determine target column
    let targetStatus: TaskStatus;
    const overTask = tasks.find(t => t.id === over.id);
    if (overTask) {
      targetStatus = overTask.status;
    } else {
      targetStatus = over.id as TaskStatus;
    }

    if (targetStatus === task.status) return;

    // If moving from unassigned → backlog/in_progress, show assign dialog
    if (task.status === 'unassigned' && (targetStatus === 'backlog' || targetStatus === 'in_progress')) {
      setPendingAssign({ task, targetStatus });
      return;
    }

    // If moving to unassigned, un-assign
    if (targetStatus === 'unassigned') {
      moveTask(task.id, 'unassigned', 0, null);
      addNote(task.id, `Task unassigned and moved back to Unassigned`, true);
      return;
    }

    // Otherwise, just move
    moveTask(task.id, targetStatus, 0);
  }, [tasks, moveTask, addNote]);

  const handleAssignConfirm = useCallback(async (note: string) => {
    if (!pendingAssign || !currentUser) return;
    const { task, targetStatus } = pendingAssign;

    await moveTask(task.id, targetStatus, 0, currentUser.id);
    await addNote(task.id, `Task assigned to ${currentUser.displayName}`, true);
    if (note.trim()) {
      await addNote(task.id, note);
    }
    setPendingAssign(null);
  }, [pendingAssign, currentUser, moveTask, addNote]);

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 p-6 flex-1 overflow-x-auto">
          {COLUMNS.map(status =>
            columnVisibility[status] ? (
              <Column key={status} status={status} tasks={tasksByStatus[status]} />
            ) : (
              <CollapsedColumn key={status} status={status} count={tasksByStatus[status].length} />
            )
          )}
        </div>

        <DragOverlay>
          {activeTask && <TaskCard task={activeTask} />}
        </DragOverlay>
      </DndContext>

      {pendingAssign && (
        <AssignDialog
          task={pendingAssign.task}
          targetStatus={pendingAssign.targetStatus}
          onConfirm={handleAssignConfirm}
          onCancel={() => setPendingAssign(null)}
        />
      )}
    </>
  );
}
