/**
 * ArtifactPreview Component
 * Displays artifact list with Markdown preview
 * Requirements: 10.1, 10.2, 10.3
 */

import { useState } from 'react';
import { clsx } from 'clsx';
import { FileText, ChevronDown, ChevronRight } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import type { ArtifactInfo } from '../types';
import { REQUIRED_ARTIFACT_TABS } from '../../shared/constants/artifacts';

// ============================================================
// Task 6.1: ArtifactPreview Types
// Requirements: 10.1, 10.2, 10.3
// ============================================================

export interface ArtifactPreviewProps {
  artifacts: {
    requirements: ArtifactInfo | null;
    design: ArtifactInfo | null;
    tasks: ArtifactInfo | null;
  };
}

/** Use shared constant for artifact entries (required artifacts only) */
const ARTIFACT_ENTRIES = REQUIRED_ARTIFACT_TABS;

export function ArtifactPreview({ artifacts }: ArtifactPreviewProps) {
  const [expandedArtifacts, setExpandedArtifacts] = useState<Set<string>>(new Set());

  const toggleExpanded = (key: string) => {
    setExpandedArtifacts((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div className="space-y-2">
      {ARTIFACT_ENTRIES.map((entry) => (
        <ArtifactItem
          key={entry.key}
          name={entry.label}
          artifact={artifacts[entry.key as keyof typeof artifacts]}
          isExpanded={expandedArtifacts.has(entry.key)}
          onToggle={() => toggleExpanded(entry.key)}
        />
      ))}
    </div>
  );
}

interface ArtifactItemProps {
  name: string;
  artifact: ArtifactInfo | null;
  isExpanded: boolean;
  onToggle: () => void;
}

function ArtifactItem({ name, artifact, isExpanded, onToggle }: ArtifactItemProps) {
  const exists = artifact?.exists ?? false;
  const content = artifact?.content;
  const hasContent = exists && !!content;

  return (
    <div className="rounded-lg bg-gray-50 dark:bg-gray-800 overflow-hidden">
      {/* Header - Clickable */}
      <button
        onClick={() => hasContent && onToggle()}
        disabled={!hasContent}
        className={clsx(
          'w-full flex items-center justify-between p-3',
          'transition-colors',
          hasContent && 'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer',
          !hasContent && 'cursor-default'
        )}
      >
        <div className="flex items-center gap-2">
          {hasContent ? (
            isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )
          ) : (
            <FileText
              className={clsx(
                'w-4 h-4',
                exists ? 'text-blue-500' : 'text-gray-300'
              )}
            />
          )}
          <span
            className={clsx(
              'font-mono text-sm',
              exists ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'
            )}
          >
            {name}
          </span>
        </div>

        {exists ? (
          <span className="text-xs text-gray-500">
            {artifact?.updatedAt ? formatDate(artifact.updatedAt) : '存在'}
          </span>
        ) : (
          <span className="text-xs text-gray-400">未作成</span>
        )}
      </button>

      {/* Markdown Content */}
      {isExpanded && content && (
        <div
          data-testid="artifact-content"
          className="border-t border-gray-200 dark:border-gray-700"
        >
          <div className="p-4 max-h-96 overflow-y-auto" data-color-mode="dark">
            <MDEditor.Markdown source={content} />
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
