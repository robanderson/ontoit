import { useState, useEffect, useCallback } from 'react';
import { X, Plus, Bot, Shield, ShieldCheck } from 'lucide-react';

interface AgentUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: string;
  isAgent?: boolean;
  requiresApproval?: boolean;
  approverUserId?: string | null;
}

interface AgentSettingsProps {
  onClose: () => void;
  apiBaseUrl?: string;
}

export function AgentSettings({ onClose, apiBaseUrl = 'http://localhost:3001' }: AgentSettingsProps) {
  const [agents, setAgents] = useState<AgentUser[]>([]);
  const [allUsers, setAllUsers] = useState<AgentUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRequiresApproval, setNewRequiresApproval] = useState(true);
  const [newApprover, setNewApprover] = useState('');

  const api = useCallback(async (path: string, options?: RequestInit) => {
    const res = await fetch(`${apiBaseUrl}${path}`, {
      headers: { 'Content-Type': 'application/json', 'X-User-Id': 'user-1', 'X-Source': 'gui', ...options?.headers },
      ...options,
    });
    return res.json();
  }, [apiBaseUrl]);

  const action = useCallback(async (actionType: string, entityType: string, entityId: string, payload: Record<string, unknown>) => {
    const { requestId } = await api('/api/request', { method: 'POST' });
    return api('/api/action', {
      method: 'POST',
      body: JSON.stringify({ requestId, action: actionType, entityType, entityId, payload }),
    });
  }, [api]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const users = await api('/api/users');
      setAllUsers(users);
      setAgents(users.filter((u: AgentUser) => u.isAgent));
    } catch (err) {
      console.error('Failed to load agents:', err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    if (!newUsername.trim() || !newDisplayName.trim()) return;
    await action('CreateUser', 'user', 'new', {
      username: newUsername.trim(),
      displayName: newDisplayName.trim(),
      email: newEmail.trim(),
      role: 'agent',
      isAgent: true,
      requiresApproval: newRequiresApproval,
      approverUserId: newApprover || null,
    });
    setShowCreate(false);
    setNewUsername('');
    setNewDisplayName('');
    setNewEmail('');
    setNewRequiresApproval(true);
    setNewApprover('');
    await loadData();
  };

  const toggleApproval = async (agent: AgentUser) => {
    await action('UpdateUser', 'user', agent.id, {
      requiresApproval: !agent.requiresApproval,
    });
    await loadData();
  };

  const updateApprover = async (agent: AgentUser, approverUserId: string) => {
    await action('UpdateUser', 'user', agent.id, {
      approverUserId: approverUserId || null,
    });
    await loadData();
  };

  const humanUsers = allUsers.filter(u => !u.isAgent);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-xl max-h-[80vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
            <Bot size={20} />
            Agent Management
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[var(--color-brand-500)] text-white rounded-md hover:bg-[var(--color-brand-600)] transition-colors"
            >
              <Plus size={12} />
              New Agent
            </button>
            <button onClick={onClose} className="p-1.5 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] rounded">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="px-5 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase text-[var(--color-text-tertiary)] font-medium">Username</label>
                <input
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  placeholder="agent-email-monitor"
                  className="block w-full text-xs px-2 py-1.5 border border-[var(--color-border)] rounded-md"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-[var(--color-text-tertiary)] font-medium">Display Name</label>
                <input
                  value={newDisplayName}
                  onChange={e => setNewDisplayName(e.target.value)}
                  placeholder="Email Monitor Agent"
                  className="block w-full text-xs px-2 py-1.5 border border-[var(--color-border)] rounded-md"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-[var(--color-text-tertiary)] font-medium">Email</label>
                <input
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="agent@ontoit.local"
                  className="block w-full text-xs px-2 py-1.5 border border-[var(--color-border)] rounded-md"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-[var(--color-text-tertiary)] font-medium">Approver</label>
                <select
                  value={newApprover}
                  onChange={e => setNewApprover(e.target.value)}
                  className="block w-full text-xs px-2 py-1.5 border border-[var(--color-border)] rounded-md"
                >
                  <option value="">None (auto-apply)</option>
                  {humanUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.displayName}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3">
              <label className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                <input
                  type="checkbox"
                  checked={newRequiresApproval}
                  onChange={e => setNewRequiresApproval(e.target.checked)}
                  className="rounded"
                />
                Require human approval for actions
              </label>
              <button
                onClick={handleCreate}
                disabled={!newUsername.trim() || !newDisplayName.trim()}
                className="ml-auto text-xs px-4 py-1.5 bg-[var(--color-brand-600)] text-white rounded-md hover:bg-[var(--color-brand-700)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Agent
              </button>
            </div>
          </div>
        )}

        {/* Agent list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-sm text-[var(--color-text-tertiary)]">Loading...</div>
          ) : agents.length === 0 ? (
            <div className="p-8 text-center text-sm text-[var(--color-text-tertiary)]">
              No agents configured. Click "New Agent" to create one.
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {agents.map(agent => {
                const approver = humanUsers.find(u => u.id === agent.approverUserId);
                return (
                  <div key={agent.id} className="px-5 py-3 hover:bg-[var(--color-surface-secondary)] transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                          <Bot size={16} />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-[var(--color-text-primary)]">
                            {agent.displayName}
                          </div>
                          <div className="text-[10px] text-[var(--color-text-tertiary)] font-mono">
                            {agent.username} &middot; {agent.id}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleApproval(agent)}
                        className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border transition-colors ${
                          agent.requiresApproval
                            ? 'border-amber-300 bg-amber-50 text-amber-700'
                            : 'border-green-300 bg-green-50 text-green-700'
                        }`}
                      >
                        {agent.requiresApproval ? <Shield size={12} /> : <ShieldCheck size={12} />}
                        {agent.requiresApproval ? 'Approval Required' : 'Auto-Apply'}
                      </button>
                    </div>
                    {agent.requiresApproval && (
                      <div className="mt-2 ml-11 flex items-center gap-2">
                        <span className="text-[10px] text-[var(--color-text-tertiary)] uppercase font-medium">Approver:</span>
                        <select
                          value={agent.approverUserId ?? ''}
                          onChange={e => updateApprover(agent, e.target.value)}
                          className="text-xs px-2 py-0.5 border border-[var(--color-border)] rounded-md"
                        >
                          <option value="">Not set</option>
                          {humanUsers.map(u => (
                            <option key={u.id} value={u.id}>{u.displayName}</option>
                          ))}
                        </select>
                        {approver && (
                          <span className="text-xs text-[var(--color-text-secondary)]">
                            ({approver.displayName})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
