import { useState, useEffect, useCallback } from 'react';
import { X, Search, ChevronDown, ChevronRight, RefreshCw, Download } from 'lucide-react';

interface JournalEntry {
  id: string;
  requestId: number;
  userId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  payload: Record<string, unknown>;
  responseCode: string;
  responsePayload: Record<string, unknown> | null;
  source: string;
  status: string;
  createdAt: string;
}

interface JournalViewerProps {
  onClose: () => void;
  apiBaseUrl?: string;
}

const PAGE_SIZE = 100;

export function JournalViewer({ onClose, apiBaseUrl = 'http://localhost:3001' }: JournalViewerProps) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [filterUserId, setFilterUserId] = useState('');
  const [filterEntityId, setFilterEntityId] = useState('');
  const [filterRequestId, setFilterRequestId] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const fetchEntries = useCallback(async (newOffset = 0) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(newOffset));
      if (filterUserId) params.set('userId', filterUserId);
      if (filterEntityId) params.set('entityId', filterEntityId);
      if (filterRequestId) params.set('requestId', filterRequestId);
      if (filterDateFrom) params.set('dateFrom', filterDateFrom);
      if (filterDateTo) params.set('dateTo', filterDateTo);

      const res = await fetch(`${apiBaseUrl}/api/journal?${params}`);
      const data = await res.json();
      setEntries(data.entries);
      setTotal(data.total);
      setOffset(newOffset);
    } catch (err) {
      console.error('Failed to fetch journal:', err);
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, filterUserId, filterEntityId, filterRequestId, filterDateFrom, filterDateTo]);

  useEffect(() => {
    fetchEntries(0);
  }, [fetchEntries]);

  const handleSearch = () => fetchEntries(0);
  const handleLoadMore = () => fetchEntries(offset + PAGE_SIZE);
  const handleLoadPrev = () => fetchEntries(Math.max(0, offset - PAGE_SIZE));

  const handleCreateCheckpoint = async () => {
    try {
      await fetch(`${apiBaseUrl}/api/journal/checkpoint`, { method: 'POST' });
      fetchEntries(0);
    } catch (err) {
      console.error('Failed to create checkpoint:', err);
    }
  };

  const handleApprove = async (entryId: string) => {
    try {
      await fetch(`${apiBaseUrl}/api/journal/${entryId}/approve`, {
        method: 'POST',
        headers: { 'X-User-Id': 'user-1' },
      });
      fetchEntries(offset);
    } catch (err) {
      console.error('Failed to approve entry:', err);
    }
  };

  const handleReject = async (entryId: string) => {
    try {
      await fetch(`${apiBaseUrl}/api/journal/${entryId}/reject`, {
        method: 'POST',
        headers: { 'X-User-Id': 'user-1' },
      });
      fetchEntries(offset);
    } catch (err) {
      console.error('Failed to reject entry:', err);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'applied': return 'text-green-700 bg-green-50';
      case 'pending': return 'text-amber-700 bg-amber-50';
      case 'reverted': return 'text-red-700 bg-red-50';
      default: return 'text-gray-700 bg-gray-50';
    }
  };

  const sourceColor = (source: string) => {
    switch (source) {
      case 'agent': return 'text-purple-700 bg-purple-50';
      case 'gui': return 'text-blue-700 bg-blue-50';
      case 'system': return 'text-gray-700 bg-gray-50';
      case 'cli': return 'text-orange-700 bg-orange-50';
      default: return 'text-gray-700 bg-gray-50';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Journal Log</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreateCheckpoint}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[var(--color-brand-500)] text-white rounded-md hover:bg-[var(--color-brand-600)] transition-colors"
            >
              <Download size={12} />
              Create Checkpoint
            </button>
            <button onClick={onClose} className="p-1.5 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] rounded">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <label className="text-[10px] uppercase text-[var(--color-text-tertiary)] font-medium">User ID</label>
              <input
                value={filterUserId}
                onChange={e => setFilterUserId(e.target.value)}
                placeholder="e.g. user-1"
                className="block w-28 text-xs px-2 py-1 border border-[var(--color-border)] rounded-md"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-[var(--color-text-tertiary)] font-medium">Task/Entity ID</label>
              <input
                value={filterEntityId}
                onChange={e => setFilterEntityId(e.target.value)}
                placeholder="e.g. task-1"
                className="block w-28 text-xs px-2 py-1 border border-[var(--color-border)] rounded-md"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-[var(--color-text-tertiary)] font-medium">Request ID</label>
              <input
                value={filterRequestId}
                onChange={e => setFilterRequestId(e.target.value)}
                placeholder="e.g. 1262"
                className="block w-20 text-xs px-2 py-1 border border-[var(--color-border)] rounded-md"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-[var(--color-text-tertiary)] font-medium">From</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={e => setFilterDateFrom(e.target.value)}
                className="block text-xs px-2 py-1 border border-[var(--color-border)] rounded-md"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-[var(--color-text-tertiary)] font-medium">To</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={e => setFilterDateTo(e.target.value)}
                className="block text-xs px-2 py-1 border border-[var(--color-border)] rounded-md"
              />
            </div>
            <button
              onClick={handleSearch}
              className="flex items-center gap-1 text-xs px-3 py-1.5 bg-[var(--color-surface-tertiary)] rounded-md hover:bg-[var(--color-border)] transition-colors"
            >
              <Search size={12} />
              Search
            </button>
            <button
              onClick={() => fetchEntries(offset)}
              className="p-1.5 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] rounded"
              title="Refresh"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Entry list */}
        <div className="flex-1 overflow-y-auto">
          {loading && entries.length === 0 ? (
            <div className="p-8 text-center text-sm text-[var(--color-text-tertiary)]">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="p-8 text-center text-sm text-[var(--color-text-tertiary)]">No journal entries found.</div>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {entries.map(entry => {
                const isExpanded = expandedId === entry.id;
                return (
                  <div key={entry.id} className="hover:bg-[var(--color-surface-secondary)] transition-colors">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      className="w-full px-5 py-2.5 flex items-center gap-3 text-left"
                    >
                      {isExpanded ? <ChevronDown size={14} className="shrink-0 text-[var(--color-text-tertiary)]" /> : <ChevronRight size={14} className="shrink-0 text-[var(--color-text-tertiary)]" />}

                      <span className="text-[10px] text-[var(--color-text-tertiary)] font-mono w-10 shrink-0">
                        #{entry.requestId}
                      </span>

                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${statusColor(entry.status)}`}>
                        {entry.status}
                      </span>

                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${sourceColor(entry.source)}`}>
                        {entry.source}
                      </span>

                      <span className="text-xs font-medium text-[var(--color-text-primary)] truncate">
                        {entry.action}
                      </span>

                      <span className="text-[10px] text-[var(--color-text-tertiary)] truncate">
                        {entry.entityType}{entry.entityId ? `:${entry.entityId}` : ''}
                      </span>

                      <span className="text-[10px] text-[var(--color-text-tertiary)] ml-auto shrink-0">
                        {entry.userId}
                      </span>

                      <span className="text-[10px] text-[var(--color-text-tertiary)] shrink-0">
                        {new Date(entry.createdAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'medium' })}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="px-5 pb-3 ml-8">
                        <div className="bg-[var(--color-surface-secondary)] rounded-lg p-3 text-xs font-mono overflow-x-auto">
                          <div className="mb-2">
                            <span className="text-[var(--color-text-tertiary)]">Payload:</span>
                            <pre className="mt-1 whitespace-pre-wrap text-[var(--color-text-secondary)]">
                              {JSON.stringify(entry.payload, null, 2)}
                            </pre>
                          </div>
                          {entry.responsePayload && (
                            <div>
                              <span className="text-[var(--color-text-tertiary)]">Response:</span>
                              <pre className="mt-1 whitespace-pre-wrap text-[var(--color-text-secondary)]">
                                {JSON.stringify(entry.responsePayload, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                        {entry.status === 'pending' && (
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => handleApprove(entry.id)}
                              className="text-xs px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(entry.id)}
                              className="text-xs px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination footer */}
        <div className="flex items-center justify-between px-5 py-2 border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
          <span className="text-xs text-[var(--color-text-tertiary)]">
            Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total} entries
          </span>
          <div className="flex gap-2">
            {offset > 0 && (
              <button
                onClick={handleLoadPrev}
                className="text-xs px-3 py-1 bg-[var(--color-surface-tertiary)] rounded-md hover:bg-[var(--color-border)]"
              >
                Previous
              </button>
            )}
            {offset + PAGE_SIZE < total && (
              <button
                onClick={handleLoadMore}
                className="text-xs px-3 py-1 bg-[var(--color-surface-tertiary)] rounded-md hover:bg-[var(--color-border)]"
              >
                Load More
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
