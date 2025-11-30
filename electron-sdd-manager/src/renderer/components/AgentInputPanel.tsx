/**
 * AgentInputPanel Component
 * Input panel for resuming completed SDD Agent sessions
 * Task 32.1-32.2: Session resume input UI and input history
 *
 * Updated: Now used for session resume instead of stdin
 * - Disabled when agent is running (can't resume active session)
 * - Enabled when agent is completed/error (can resume with -r)
 */

import { useState } from 'react';
import { Play, History, Clock } from 'lucide-react';
import { useAgentStore } from '../stores/agentStore';
import { clsx } from 'clsx';

interface InputHistoryItem {
  id: string;
  input: string;
  timestamp: number;
}

export function AgentInputPanel() {
  const { selectedAgentId, resumeAgent, getAgentById } = useAgentStore();

  const [inputValue, setInputValue] = useState('');
  const [history, setHistory] = useState<InputHistoryItem[]>([]);

  const agent = selectedAgentId ? getAgentById(selectedAgentId) : undefined;

  // Can resume if: agent exists, has sessionId, and is not running
  const isRunning = agent?.status === 'running' || agent?.status === 'hang';
  const canResume = agent && agent.sessionId && !isRunning;
  const isDisabled = !selectedAgentId || !canResume;

  // Handle resume session
  const handleSend = async (input: string) => {
    if (!input.trim() || !selectedAgentId) return;

    await resumeAgent(selectedAgentId, input);

    // Add to history
    const historyItem: InputHistoryItem = {
      id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      input,
      timestamp: Date.now(),
    };
    setHistory((prev) => [...prev, historyItem]);

    // Clear input
    setInputValue('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(inputValue);
    }
  };

  // Resend from history
  const handleHistoryClick = (input: string) => {
    handleSend(input);
  };

  return (
    <div className="shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="追加の指示を入力..."
          disabled={isDisabled}
          className={clsx(
            'flex-1 px-3 py-2 text-sm rounded-md',
            'bg-white dark:bg-gray-900',
            'border border-gray-300 dark:border-gray-600',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            'disabled:bg-gray-100 dark:disabled:bg-gray-800',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'placeholder:text-gray-400 dark:placeholder:text-gray-500'
          )}
        />
        <button
          type="submit"
          disabled={isDisabled || !inputValue.trim()}
          className={clsx(
            'flex items-center gap-1 px-3 py-2 rounded-md',
            'text-sm font-medium',
            'bg-green-500 text-white hover:bg-green-600',
            'disabled:bg-gray-300 dark:disabled:bg-gray-700',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          <Play className="w-4 h-4" />
          続行
        </button>
      </form>

      {/* Input history */}
      {history.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center gap-1 mb-2 text-xs text-gray-500">
            <History className="w-3 h-3" />
            入力履歴
          </div>
          <div className="flex flex-wrap gap-2">
            {history.slice(-5).map((item) => (
              <button
                key={item.id}
                onClick={() => handleHistoryClick(item.input)}
                disabled={isDisabled}
                className={clsx(
                  'flex items-center gap-1 px-2 py-1 rounded text-xs',
                  'bg-gray-200 dark:bg-gray-700',
                  'text-gray-700 dark:text-gray-300',
                  'hover:bg-gray-300 dark:hover:bg-gray-600',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'max-w-[200px] truncate'
                )}
                title={item.input}
              >
                <Clock className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{item.input}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
