/**
 * AgentInputPanel Component
 * Input panel for resuming completed SDD Agent sessions
 *
 * Updated: Now used for session resume instead of stdin
 * - Disabled when agent is running (can't resume active session)
 * - Enabled when agent is completed/error (can resume with -r)
 * - Supports multiline input with Option+Enter for newlines
 */

import { useState, useRef, useEffect } from 'react';
import { Send, Play } from 'lucide-react';
import { useAgentStore } from '../stores/agentStore';
import { clsx } from 'clsx';

export function AgentInputPanel() {
  const { selectedAgentId, resumeAgent, getAgentById } = useAgentStore();

  const [inputValue, setInputValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const agent = selectedAgentId ? getAgentById(selectedAgentId) : undefined;

  // Can resume if: agent exists, has sessionId, and is not running
  const isRunning = agent?.status === 'running' || agent?.status === 'hang';
  const canResume = agent && agent.sessionId && !isRunning;
  const isDisabled = !selectedAgentId || !canResume;

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Set height based on content, with min and max constraints
      const lineHeight = 20; // approximate line height in pixels
      const minHeight = lineHeight + 16; // 1 line + padding
      const maxHeight = lineHeight * 5 + 16; // 5 lines + padding
      const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
      textarea.style.height = `${newHeight}px`;
    }
  }, [inputValue]);

  // Handle resume session
  const handleSend = async (input: string) => {
    if (!input.trim() || !selectedAgentId) return;

    await resumeAgent(selectedAgentId, input);

    // Clear input
    setInputValue('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // IME変換中（isComposing）はEnterキーを無視
    if (e.nativeEvent.isComposing) return;

    // Option(Alt)+Enter: 改行を挿入（デフォルト動作を許可）
    if (e.key === 'Enter' && e.altKey) {
      return;
    }

    // Enter（Shift無し）: 送信
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(inputValue);
    }
  };

  return (
    <div className="shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex items-start gap-2">
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="追加の指示を入力... (Option+Enterで改行)"
          disabled={isDisabled}
          rows={1}
          className={clsx(
            'flex-1 px-3 py-2 text-sm rounded-md resize-none',
            'bg-white dark:bg-gray-900',
            'text-gray-900 dark:text-gray-100',
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
            'bg-blue-500 text-white hover:bg-blue-600',
            'disabled:bg-gray-300 dark:disabled:bg-gray-700',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          <Send className="w-4 h-4" />
          送信
        </button>
        <button
          type="button"
          disabled={isDisabled}
          onClick={() => handleSend('続けて')}
          className={clsx(
            'flex items-center gap-1 px-3 py-2 rounded-md',
            'text-sm font-medium',
            'bg-green-500 text-white hover:bg-green-600',
            'disabled:bg-gray-300 dark:disabled:bg-gray-700',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
          title="「続けて」を送信"
        >
          <Play className="w-4 h-4" />
          続行を指示
        </button>
      </form>
    </div>
  );
}
