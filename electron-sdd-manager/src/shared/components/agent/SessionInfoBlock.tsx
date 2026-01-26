/**
 * SessionInfoBlock Component
 * Displays session initialization information (cwd, model, version)
 *
 * Task 2.5: SessionInfoBlockコンポーネントを作成
 * llm-stream-log-parser Task 7.2: engineId support for dynamic header
 * Requirements: 5.1, 5.2, 7.1, 7.2, 7.3, 4.1, 4.2
 */

import React from 'react';
import { FolderOpen, Cpu, Tag } from 'lucide-react';
import { clsx } from 'clsx';
import { getLLMEngine, type LLMEngineId } from '@shared/registry';

export interface SessionInfoBlockProps {
  session: {
    cwd?: string;
    model?: string;
    version?: string;
  };
  /**
   * LLM engine ID for display name lookup
   * llm-stream-log-parser Task 7.2: engineId support
   * Requirements: 4.1, 4.2
   */
  engineId?: LLMEngineId;
}

/**
 * Get session header label based on engineId
 * Requirements: 4.1, 4.2 - Dynamic engine label display
 */
function getSessionLabel(engineId?: LLMEngineId): string {
  if (!engineId) {
    return 'Session Started';
  }

  const engine = getLLMEngine(engineId);
  const engineLabel = engine?.label ?? 'Claude';
  return `${engineLabel} Session Started`;
}

export function SessionInfoBlock({ session, engineId }: SessionInfoBlockProps): React.ReactElement | null {
  const { cwd, model, version } = session;

  // Don't render if all fields are undefined
  if (!cwd && !model && !version) {
    return null;
  }

  // llm-stream-log-parser Task 7.2: Dynamic label based on engineId
  const sessionLabel = getSessionLabel(engineId);

  return (
    <div
      data-testid="session-info-block"
      className={clsx(
        'rounded-lg p-3 border',
        // Visual distinction with cyan background (Requirement 5.2)
        'bg-cyan-50 dark:bg-cyan-900/20',
        'border-cyan-200 dark:border-cyan-700'
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <FolderOpen
          data-testid="session-info-icon"
          className="w-4 h-4 text-cyan-600 dark:text-cyan-400"
        />
        <span className="text-sm font-medium text-cyan-700 dark:text-cyan-300">
          {sessionLabel}
        </span>
      </div>

      <div className="grid gap-1.5 text-sm">
        {cwd && (
          <div className="flex items-center gap-2">
            <FolderOpen className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
            <span className="text-gray-600 dark:text-gray-400">Working Directory:</span>
            <span className="font-mono text-gray-800 dark:text-gray-200">{cwd}</span>
          </div>
        )}

        {model && (
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
            <span className="text-gray-600 dark:text-gray-400">Model:</span>
            <span className="font-mono text-gray-800 dark:text-gray-200">{model}</span>
          </div>
        )}

        {version && (
          <div className="flex items-center gap-2">
            <Tag className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
            <span className="text-gray-600 dark:text-gray-400">Version:</span>
            <span className="font-mono text-gray-800 dark:text-gray-200">{version}</span>
          </div>
        )}
      </div>
    </div>
  );
}
