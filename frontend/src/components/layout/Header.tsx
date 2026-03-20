import { useState } from 'react';
import { Plus, RotateCcw, PanelLeft, ScrollText } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { EnvironmentBadge } from './EnvironmentBadge';
import { resetLocalData } from '../../adapters/LocalAdapter';
import { JournalViewer } from '../settings/JournalViewer';

export function Header() {
  const { currentUser, setCreatingTask, loadData, environment, toggleSidebar, isSidebarOpen } = useAppStore();
  const [showJournal, setShowJournal] = useState(false);

  const handleReset = () => {
    if (confirm('Reset all local data to seed fixtures?')) {
      resetLocalData();
      loadData();
    }
  };

  return (
    <>
    <header className="bg-white border-b border-[var(--color-border)] px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className={`p-1.5 rounded-lg transition-colors ${
            isSidebarOpen
              ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-600)]'
              : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-tertiary)]'
          }`}
          title="Toggle column visibility sidebar"
        >
          <PanelLeft size={18} />
        </button>
        <h1 className="text-xl font-semibold tracking-tight text-[var(--color-text-primary)]">
          OnToIt
        </h1>
        <EnvironmentBadge />
      </div>

      <div className="flex items-center gap-3">
        {environment === 'local' && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface-tertiary)] transition-colors"
          >
            <RotateCcw size={14} />
            Reset Data
          </button>
        )}
        {environment !== 'local' && (
          <button
            onClick={() => setShowJournal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface-tertiary)] transition-colors"
          >
            <ScrollText size={14} />
            Journal
          </button>
        )}
        <button
          onClick={() => setCreatingTask(true)}
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-[var(--color-brand-600)] rounded-lg hover:bg-[var(--color-brand-700)] transition-colors"
        >
          <Plus size={16} />
          New Task
        </button>
        {currentUser && (
          <div className="flex items-center gap-2 pl-3 border-l border-[var(--color-border)]">
            <div className="w-8 h-8 rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-600)] flex items-center justify-center text-sm font-medium">
              {currentUser.displayName.charAt(0)}
            </div>
            <span className="text-sm text-[var(--color-text-secondary)]">
              {currentUser.displayName}
            </span>
          </div>
        )}
      </div>
    </header>
    {showJournal && <JournalViewer onClose={() => setShowJournal(false)} />}
    </>
  );
}
