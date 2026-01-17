/**
 * SpecDetail Component
 * Displays specification details and metadata
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 * git-worktree-support: Task 12.1, 12.2 - worktree information display (Requirements: 4.1, 4.2)
 */

import { useState } from 'react';
import {
  FileText,
  Calendar,
  Globe,
  CheckCircle,
  Circle,
  Rocket,
  ListTodo,
  ChevronDown,
  ChevronRight,
  GitBranch,
  FolderGit2,
} from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import { useSpecStore } from '../stores';
import { clsx } from 'clsx';
import type { Phase, ArtifactInfo } from '../types';
import { hasWorktreePath, type WorktreeConfig } from '../types/worktree';

const PHASE_LABELS = {
  requirements: '要件定義',
  design: '設計',
  tasks: 'タスク',
};

export function SpecDetail() {
  const { selectedSpec, specDetail, isLoading } = useSpecStore();

  if (!selectedSpec) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        仕様を選択してください
      </div>
    );
  }

  if (isLoading || !specDetail) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-gray-400">読み込み中...</div>
      </div>
    );
  }

  // spec-metadata-ssot-refactor: metadata no longer has phase, use specJson.phase instead
  const { specJson, artifacts, taskProgress } = specDetail;

  // Validate specJson structure to prevent crashes
  if (!specJson || !specJson.feature_name) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        <div className="text-center space-y-2">
          <p>spec.jsonの読み込みに失敗しました</p>
          <p className="text-sm text-gray-500">
            spec.jsonの形式が正しくない可能性があります
          </p>
        </div>
      </div>
    );
  }

  const isReadyForImplementation =
    specJson.documentReview?.status === 'approved' ||
    specJson.documentReview?.status === 'skipped';

  return (
    <div className="p-6 space-y-6">
      {/* Implementation Ready Badge */}
      {isReadyForImplementation && (
        <div className="flex justify-end">
          <span
            className={clsx(
              'flex items-center gap-1 px-3 py-1.5 rounded-full',
              'bg-green-100 text-green-700 text-sm font-medium'
            )}
          >
            <Rocket className="w-4 h-4" />
            実装可能
          </span>
        </div>
      )}

      {/* Metadata */}
      {/* spec-metadata-ssot-refactor: phase moved from metadata to specJson (SSOT) */}
      <div className="grid grid-cols-2 gap-4">
        <MetadataItem
          icon={<FileText className="w-4 h-4" />}
          label="フェーズ"
          value={specJson.phase}
        />
        <MetadataItem
          icon={<Globe className="w-4 h-4" />}
          label="言語"
          value={specJson.language === 'ja' ? '日本語' : '英語'}
        />
        <MetadataItem
          icon={<Calendar className="w-4 h-4" />}
          label="作成日"
          value={formatDate(specJson.created_at)}
        />
        <MetadataItem
          icon={<Calendar className="w-4 h-4" />}
          label="更新日"
          value={formatDate(specJson.updated_at)}
        />
      </div>

      {/* git-worktree-support: Task 12.1, 12.2 - Worktree Information Section */}
      {/* worktree-execution-ui Task 8.1: Only show when actual worktree mode (path exists) */}
      {hasWorktreePath(specJson) && specJson.worktree && (
        <WorktreeSection worktree={specJson.worktree} />
      )}

      {/* Approval Status */}
      <div>
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">
          承認状態
        </h3>
        <div className="space-y-2">
          {(['requirements', 'design', 'tasks'] as Phase[]).map((phase) => (
            <ApprovalStatusItem
              key={phase}
              phase={phase}
              status={specJson.approvals[phase]}
            />
          ))}
        </div>
      </div>

      {/* Task Progress */}
      {taskProgress && (
        <div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">
            <ListTodo className="w-5 h-5 inline-block mr-2" />
            タスク進捗
          </h3>
          <div
            className={clsx(
              'p-4 rounded-lg',
              'bg-gray-50 dark:bg-gray-800'
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {taskProgress.completed} / {taskProgress.total} タスク完了
              </span>
              <span
                className={clsx(
                  'text-sm font-bold',
                  taskProgress.percentage === 100
                    ? 'text-green-600'
                    : taskProgress.percentage >= 50
                      ? 'text-blue-600'
                      : 'text-gray-600'
                )}
              >
                {taskProgress.percentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className={clsx(
                  'h-3 rounded-full transition-all duration-300',
                  taskProgress.percentage === 100
                    ? 'bg-green-500'
                    : taskProgress.percentage >= 50
                      ? 'bg-blue-500'
                      : 'bg-gray-400'
                )}
                style={{ width: `${taskProgress.percentage}%` }}
              />
            </div>
            {taskProgress.percentage === 100 && (
              <div className="mt-2 text-sm text-green-600 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                すべてのタスクが完了しました
              </div>
            )}
          </div>
        </div>
      )}

      {/* Artifacts */}
      <div>
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">
          成果物
        </h3>
        <div className="space-y-2">
          <ArtifactItem
            name="requirements.md"
            artifact={artifacts.requirements}
          />
          <ArtifactItem
            name="design.md"
            artifact={artifacts.design}
          />
          <ArtifactItem
            name="tasks.md"
            artifact={artifacts.tasks}
          />
        </div>
      </div>
    </div>
  );
}

interface MetadataItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function MetadataItem({ icon, label, value }: MetadataItemProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-400">{icon}</span>
      <span className="text-gray-500">{label}:</span>
      <span className="text-gray-700 dark:text-gray-300">{value}</span>
    </div>
  );
}

interface ApprovalStatusItemProps {
  phase: Phase;
  status: { generated: boolean; approved: boolean };
}

function ApprovalStatusItem({ phase, status }: ApprovalStatusItemProps) {
  return (
    <div
      className={clsx(
        'flex items-center justify-between p-3 rounded-lg',
        'bg-gray-50 dark:bg-gray-800'
      )}
    >
      <span className="font-medium text-gray-700 dark:text-gray-300">
        {PHASE_LABELS[phase]}
      </span>

      <div className="flex items-center gap-3">
        <StatusBadge
          label="生成済"
          active={status.generated}
        />
        <StatusBadge
          label="承認済"
          active={status.approved}
          variant="success"
        />
      </div>
    </div>
  );
}

interface StatusBadgeProps {
  label: string;
  active: boolean;
  variant?: 'default' | 'success';
}

function StatusBadge({ label, active, variant = 'default' }: StatusBadgeProps) {
  const Icon = active ? CheckCircle : Circle;

  return (
    <span
      className={clsx(
        'flex items-center gap-1 px-2 py-1 rounded text-xs',
        active
          ? variant === 'success'
            ? 'bg-green-100 text-green-700'
            : 'bg-blue-100 text-blue-700'
          : 'bg-gray-100 text-gray-400'
      )}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

interface ArtifactItemProps {
  name: string;
  artifact: ArtifactInfo | null;
}

function ArtifactItem({ name, artifact }: ArtifactItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const exists = artifact?.exists ?? false;
  const content = artifact?.content;
  const updatedAt = artifact?.updatedAt;

  return (
    <div className="rounded-lg bg-gray-50 dark:bg-gray-800 overflow-hidden">
      {/* Header - Clickable */}
      <button
        onClick={() => exists && content && setIsExpanded(!isExpanded)}
        disabled={!exists || !content}
        className={clsx(
          'w-full flex items-center justify-between p-3',
          'transition-colors',
          exists && content && 'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer',
          !exists && 'cursor-default'
        )}
      >
        <div className="flex items-center gap-2">
          {exists && content ? (
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
            {updatedAt ? formatDate(updatedAt) : '存在'}
          </span>
        ) : (
          <span className="text-xs text-gray-400">未作成</span>
        )}
      </button>

      {/* Markdown Content */}
      {isExpanded && content && (
        <div className="border-t border-gray-200 dark:border-gray-700">
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

/**
 * WorktreeSection Component
 * Displays worktree information when spec is in worktree mode
 * git-worktree-support: Task 12.1, 12.2
 * Requirements: 4.1, 4.2
 */
interface WorktreeSectionProps {
  worktree: WorktreeConfig;
}

function WorktreeSection({ worktree }: WorktreeSectionProps) {
  return (
    <div
      data-testid="worktree-section"
      className={clsx(
        'p-4 rounded-lg',
        'bg-violet-50 dark:bg-violet-900/20',
        'border border-violet-200 dark:border-violet-800'
      )}
    >
      <h3 className="text-lg font-semibold text-violet-700 dark:text-violet-300 mb-3 flex items-center gap-2">
        <GitBranch className="w-5 h-5" />
        Worktree モード
      </h3>
      <div className="space-y-2">
        {/* Path */}
        <div className="flex items-start gap-2 text-sm">
          <FolderGit2 className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
          <div>
            <span className="text-gray-500 dark:text-gray-400">パス:</span>
            <span className="ml-2 text-gray-700 dark:text-gray-300 font-mono break-all">
              {worktree.path}
            </span>
          </div>
        </div>
        {/* Branch */}
        <div className="flex items-start gap-2 text-sm">
          <GitBranch className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
          <div>
            <span className="text-gray-500 dark:text-gray-400">ブランチ:</span>
            <span className="ml-2 text-gray-700 dark:text-gray-300 font-mono">
              {worktree.branch}
            </span>
          </div>
        </div>
        {/* Created At */}
        <div className="flex items-start gap-2 text-sm">
          <Calendar className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
          <div>
            <span className="text-gray-500 dark:text-gray-400">作成日時:</span>
            <span className="ml-2 text-gray-700 dark:text-gray-300">
              {formatDate(worktree.created_at)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
