/**
 * useSpecWorkflowHandlers Hook
 *
 * Spec右ペイン（ワークフロー）操作の共通ハンドラー。
 * Electron版とRemote UI版の両方で使用可能。
 *
 * 提供するハンドラー:
 * - handleExecutePhase: フェーズ実行
 * - handleApprovePhase: フェーズ承認
 * - handleApproveAndExecutePhase: 承認して次フェーズを実行
 * - handleStartDocumentReview: ドキュメントレビュー開始
 * - handleStartInspection: インスペクション開始
 * - handleStartAutoExecution: 自動実行開始
 * - handleStopAutoExecution: 自動実行停止
 *
 * 使用例:
 * ```tsx
 * const api = createRemoteSpecWorkflowApi(apiClient);
 * const handlers = useSpecWorkflowHandlers({
 *   api,
 *   specDetail,
 *   specPath,
 *   projectPath,  // auto-execution-projectpath-fix: Task 4.5
 *   onPhaseExecuted,
 * });
 * ```
 *
 * auto-execution-projectpath-fix Task 4.5:
 * Requirements: 4.3 - Renderer側store/hookでprojectPath取得・送信
 */

import { useCallback, useState } from 'react';
import type { ISpecWorkflowApi } from '@shared/api/ISpecWorkflowApi';
import type {
  SpecDetail,
  WorkflowPhase,
  Phase,
  AgentInfo,
  AutoExecutionOptions,
} from '@shared/api/types';

// =============================================================================
// Types
// =============================================================================

/**
 * フック設定
 */
export interface UseSpecWorkflowHandlersConfig {
  /** ISpecWorkflowApi実装 */
  api: ISpecWorkflowApi;
  /** Spec詳細（nullの場合はハンドラーは何もしない） */
  specDetail: SpecDetail | null;
  /** Specパス（Remote UI用、Electron版ではspecDetail.metadata.nameを使用） */
  specPath?: string;
  /**
   * プロジェクトパス（メインリポジトリ）
   * auto-execution-projectpath-fix Task 4.5: 自動実行開始時にイベントログ記録先として使用
   */
  projectPath?: string;
  /** フェーズ実行後のコールバック */
  onPhaseExecuted?: (phase: WorkflowPhase, agent: AgentInfo) => void;
  /** 承認更新後のコールバック */
  onApprovalUpdated?: (phase: Phase, approved: boolean) => void;
  /** エラー発生時のコールバック */
  onError?: (message: string) => void;
  /** Spec詳細更新後のコールバック */
  onSpecDetailUpdated?: (specDetail: SpecDetail) => void;
}

/**
 * フック戻り値
 */
export interface UseSpecWorkflowHandlersReturn {
  // 状態
  /** 現在実行中のフェーズ */
  executingPhase: WorkflowPhase | null;
  /** 実行中のアクション（document-review, inspection等） */
  executingAction: string | null;
  /** ローディング中かどうか */
  isLoading: boolean;

  // フェーズ操作ハンドラー
  /** フェーズを実行 */
  handleExecutePhase: (phase: WorkflowPhase) => Promise<void>;
  /** フェーズを承認 */
  handleApprovePhase: (phase: WorkflowPhase) => Promise<void>;
  /** 前フェーズを承認して現フェーズを実行 */
  handleApproveAndExecutePhase: (phase: WorkflowPhase) => Promise<void>;

  // レビュー/インスペクションハンドラー
  /** ドキュメントレビュー開始 */
  handleStartDocumentReview: () => Promise<void>;
  /** インスペクション開始 */
  handleStartInspection: () => Promise<void>;

  // 自動実行ハンドラー
  /** 自動実行開始 */
  handleStartAutoExecution: (options: AutoExecutionOptions) => Promise<void>;
  /** 自動実行停止 */
  handleStopAutoExecution: () => Promise<void>;

  // ユーティリティ
  /** Spec詳細を再取得 */
  refreshSpecDetail: () => Promise<void>;
}

// =============================================================================
// Constants
// =============================================================================

const ALL_WORKFLOW_PHASES: WorkflowPhase[] = [
  'requirements',
  'design',
  'tasks',
  'impl',
  'inspection',
  'deploy',
];

// =============================================================================
// Hook Implementation
// =============================================================================

export function useSpecWorkflowHandlers(
  config: UseSpecWorkflowHandlersConfig
): UseSpecWorkflowHandlersReturn {
  const {
    api,
    specDetail,
    specPath,
    projectPath,
    onPhaseExecuted,
    onApprovalUpdated,
    onError,
    onSpecDetailUpdated,
  } = config;

  // State
  const [executingPhase, setExecutingPhase] = useState<WorkflowPhase | null>(null);
  const [executingAction, setExecutingAction] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Helper: Get spec identifier (name or path)
  const getSpecId = useCallback(() => {
    return specDetail?.metadata.name ?? '';
  }, [specDetail]);

  const getSpecPath = useCallback(() => {
    return specPath ?? specDetail?.metadata.name ?? '';
  }, [specPath, specDetail]);

  // ===========================================================================
  // Spec Detail Refresh
  // ===========================================================================

  const refreshSpecDetail = useCallback(async () => {
    const specId = getSpecId();
    if (!specId) return;

    setIsLoading(true);
    try {
      const result = await api.getSpecDetail(specId);
      if (result.ok) {
        onSpecDetailUpdated?.(result.value);
      }
    } finally {
      setIsLoading(false);
    }
  }, [api, getSpecId, onSpecDetailUpdated]);

  // ===========================================================================
  // Phase Handlers
  // ===========================================================================

  const handleExecutePhase = useCallback(
    async (phase: WorkflowPhase) => {
      const specId = getSpecId();
      if (!specId) return;

      setExecutingPhase(phase);
      try {
        const result = await api.executePhase(specId, phase);
        if (result.ok) {
          onPhaseExecuted?.(phase, result.value);
          await refreshSpecDetail();
        } else {
          onError?.(result.error.message);
        }
      } finally {
        setExecutingPhase(null);
      }
    },
    [api, getSpecId, onPhaseExecuted, onError, refreshSpecDetail]
  );

  const handleApprovePhase = useCallback(
    async (phase: WorkflowPhase) => {
      const specId = getSpecId();
      const path = getSpecPath();
      if (!specId) return;

      try {
        const phaseKey = phase as Phase;
        const result = await api.updateApproval(path, phaseKey, true);
        if (result.ok) {
          onApprovalUpdated?.(phaseKey, true);
          await refreshSpecDetail();
        } else {
          onError?.(result.error.message);
        }
      } catch (error) {
        onError?.(error instanceof Error ? error.message : 'Unknown error');
      }
    },
    [api, getSpecId, getSpecPath, onApprovalUpdated, onError, refreshSpecDetail]
  );

  const handleApproveAndExecutePhase = useCallback(
    async (phase: WorkflowPhase) => {
      const currentIndex = ALL_WORKFLOW_PHASES.indexOf(phase);
      if (currentIndex > 0) {
        const previousPhase = ALL_WORKFLOW_PHASES[currentIndex - 1];
        await handleApprovePhase(previousPhase);
      }
      await handleExecutePhase(phase);
    },
    [handleApprovePhase, handleExecutePhase]
  );

  // ===========================================================================
  // Document Review / Inspection Handlers
  // ===========================================================================

  const handleStartDocumentReview = useCallback(async () => {
    const specId = getSpecId();
    if (!specId) return;

    setExecutingAction('document-review');
    try {
      const result = await api.executeDocumentReview(specId);
      if (result.ok) {
        onPhaseExecuted?.('design', result.value); // document-review is after design
        await refreshSpecDetail();
      } else {
        onError?.(result.error.message);
      }
    } finally {
      setExecutingAction(null);
    }
  }, [api, getSpecId, onPhaseExecuted, onError, refreshSpecDetail]);

  const handleStartInspection = useCallback(async () => {
    const specId = getSpecId();
    if (!specId) return;

    setExecutingAction('inspection');
    try {
      const result = await api.executeInspection(specId);
      if (result.ok) {
        onPhaseExecuted?.('inspection', result.value);
        await refreshSpecDetail();
      } else {
        onError?.(result.error.message);
      }
    } finally {
      setExecutingAction(null);
    }
  }, [api, getSpecId, onPhaseExecuted, onError, refreshSpecDetail]);

  // ===========================================================================
  // Auto Execution Handlers
  // auto-execution-projectpath-fix Task 4.5: Pass projectPath to API
  // ===========================================================================

  const handleStartAutoExecution = useCallback(
    async (options: AutoExecutionOptions) => {
      const specId = getSpecId();
      const path = getSpecPath();
      if (!specId) return;

      // auto-execution-projectpath-fix Task 4.5: Use projectPath from config
      // If not provided, fall back to empty string (API will handle validation)
      const effectiveProjectPath = projectPath ?? '';

      try {
        const result = await api.startAutoExecution(effectiveProjectPath, path, specId, options);
        if (!result.ok) {
          onError?.(result.error.message);
        }
      } catch (error) {
        onError?.(error instanceof Error ? error.message : 'Unknown error');
      }
    },
    [api, getSpecId, getSpecPath, projectPath, onError]
  );

  const handleStopAutoExecution = useCallback(async () => {
    const path = getSpecPath();
    if (!path) return;

    try {
      const result = await api.stopAutoExecution(path);
      if (!result.ok) {
        onError?.(result.error.message);
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Unknown error');
    }
  }, [api, getSpecPath, onError]);

  // ===========================================================================
  // Return
  // ===========================================================================

  return {
    // State
    executingPhase,
    executingAction,
    isLoading,

    // Phase handlers
    handleExecutePhase,
    handleApprovePhase,
    handleApproveAndExecutePhase,

    // Review/Inspection handlers
    handleStartDocumentReview,
    handleStartInspection,

    // Auto execution handlers
    handleStartAutoExecution,
    handleStopAutoExecution,

    // Utilities
    refreshSpecDetail,
  };
}
