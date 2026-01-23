/**
 * ElectronSpecWorkflowApi
 *
 * Electron版向けISpecWorkflowApi実装。
 * window.electronAPIをラップしてISpecWorkflowApiインターフェースを提供。
 *
 * 使用箇所:
 * - WorkflowView.tsx（将来的にuseSpecWorkflowHandlers経由で使用）
 */

import type {
  ISpecWorkflowApi,
  ImplStartError,
  ParseResult,
  ExecutePhaseOptions,
} from '@shared/api/ISpecWorkflowApi';
import type {
  Result,
  ApiError,
  AgentInfo,
  WorkflowPhase,
  Phase,
  SpecDetail,
  AutoExecutionOptions,
  AutoExecutionState,
} from '@shared/api/types';
import type { EventLogEntry, EventLogError } from '@shared/types';

// =============================================================================
// ElectronSpecWorkflowApi Implementation
// =============================================================================

/**
 * Electron版ISpecWorkflowApi実装
 *
 * window.electronAPIを使用してメイン側と通信。
 * 全てのメソッドが実装されている（Electron専用メソッドを含む）。
 */
export class ElectronSpecWorkflowApi implements ISpecWorkflowApi {
  private commandPrefix: 'kiro' | 'spec-manager';

  constructor(commandPrefix: 'kiro' | 'spec-manager' = 'kiro') {
    this.commandPrefix = commandPrefix;
  }

  /**
   * コマンドプレフィックスを設定
   */
  setCommandPrefix(prefix: 'kiro' | 'spec-manager'): void {
    this.commandPrefix = prefix;
  }

  // ===========================================================================
  // ApiClient由来のメソッド
  // ===========================================================================

  async executePhase(specId: string, phase: WorkflowPhase): Promise<Result<AgentInfo, ApiError>> {
    try {
      const result = await window.electronAPI.execute({
        type: phase as 'requirements' | 'design' | 'tasks' | 'impl' | 'inspection' | 'deploy',
        specId,
        featureName: specId,
        commandPrefix: this.commandPrefix,
      });

      return {
        ok: true,
        value: {
          id: result.agentId,
          specId,
          phase,
          status: 'running',
          startedAt: Date.now(),
        },
      };
    } catch (error) {
      return {
        ok: false,
        error: {
          type: 'EXECUTE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  async updateApproval(specId: string, phase: Phase, approved: boolean): Promise<Result<void, ApiError>> {
    try {
      await window.electronAPI.updateApproval(specId, phase, approved);
      return { ok: true, value: undefined };
    } catch (error) {
      return {
        ok: false,
        error: {
          type: 'UPDATE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  async executeDocumentReview(specId: string): Promise<Result<AgentInfo, ApiError>> {
    try {
      const result = await window.electronAPI.execute({
        type: 'document-review',
        specId,
        featureName: specId,
        commandPrefix: this.commandPrefix,
      });

      return {
        ok: true,
        value: {
          id: result.agentId,
          specId,
          phase: 'document-review',
          status: 'running',
          startedAt: Date.now(),
        },
      };
    } catch (error) {
      return {
        ok: false,
        error: {
          type: 'EXECUTE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  async executeInspection(specId: string): Promise<Result<AgentInfo, ApiError>> {
    try {
      const result = await window.electronAPI.execute({
        type: 'inspection',
        specId,
        featureName: specId,
        commandPrefix: this.commandPrefix,
      });

      return {
        ok: true,
        value: {
          id: result.agentId,
          specId,
          phase: 'inspection',
          status: 'running',
          startedAt: Date.now(),
        },
      };
    } catch (error) {
      return {
        ok: false,
        error: {
          type: 'EXECUTE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  async startAutoExecution(
    specPath: string,
    specId: string,
    options: AutoExecutionOptions
  ): Promise<Result<AutoExecutionState, ApiError>> {
    try {
      // Electron版では autoExecutionStart を使用
      // spec-path-ssot-refactor: specPathとspecIdを両方渡す
      const result = await window.electronAPI.autoExecutionStart({
        specPath: specPath || specId,
        specId,
        options: {
          permissions: {
            requirements: options.permissions.requirements ?? true,
            design: options.permissions.design ?? true,
            tasks: options.permissions.tasks ?? true,
            impl: options.permissions.impl ?? false,
          },
          documentReviewFlag: options.documentReviewFlag,
        },
      });
      if (result.ok) {
        return {
          ok: true,
          value: {
            status: result.value.status,
            currentPhase: result.value.currentPhase ?? undefined,
            completedPhases: result.value.executedPhases as WorkflowPhase[],
          },
        };
      }
      return {
        ok: false,
        error: {
          type: result.error.type,
          message: 'message' in result.error ? result.error.message ?? 'Unknown error' : 'Unknown error',
        },
      };
    } catch (error) {
      return {
        ok: false,
        error: {
          type: 'AUTO_EXECUTION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  async stopAutoExecution(specPath: string): Promise<Result<void, ApiError>> {
    try {
      // Electron版では autoExecutionStop を使用
      const result = await window.electronAPI.autoExecutionStop({ specPath });
      if (result.ok) {
        return { ok: true, value: undefined };
      }
      return {
        ok: false,
        error: {
          type: result.error.type,
          message: 'message' in result.error ? result.error.message ?? 'Unknown error' : 'Unknown error',
        },
      };
    } catch (error) {
      return {
        ok: false,
        error: {
          type: 'AUTO_EXECUTION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  async getSpecDetail(specId: string): Promise<Result<SpecDetail, ApiError>> {
    try {
      // Electron版では readSpecJson と readArtifact を組み合わせる
      const specJson = await window.electronAPI.readSpecJson(specId);

      // 基本的なSpecDetailを構築
      const specDetail: SpecDetail = {
        metadata: {
          name: specId,
        },
        specJson,
        artifacts: {
          requirements: null,
          design: null,
          tasks: null,
          research: null,
          inspection: null,
        },
        taskProgress: null,
      };

      // アーティファクトを読み込み
      try {
        const requirementsContent = await window.electronAPI.readArtifact(specId, 'requirements.md');
        specDetail.artifacts.requirements = {
          exists: true,
          updatedAt: specJson.updated_at ?? null,
          content: requirementsContent,
        };
      } catch {
        // 存在しない場合は無視
      }

      try {
        const designContent = await window.electronAPI.readArtifact(specId, 'design.md');
        specDetail.artifacts.design = {
          exists: true,
          updatedAt: specJson.updated_at ?? null,
          content: designContent,
        };
      } catch {
        // 存在しない場合は無視
      }

      try {
        const tasksContent = await window.electronAPI.readArtifact(specId, 'tasks.md');
        specDetail.artifacts.tasks = {
          exists: true,
          updatedAt: specJson.updated_at ?? null,
          content: tasksContent,
        };
      } catch {
        // 存在しない場合は無視
      }

      return { ok: true, value: specDetail };
    } catch (error) {
      return {
        ok: false,
        error: {
          type: 'FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  // ===========================================================================
  // Electron専用メソッド
  // ===========================================================================

  async updateSpecJson(specId: string, updates: Record<string, unknown>): Promise<Result<void, ApiError>> {
    try {
      await window.electronAPI.updateSpecJson(specId, updates);
      return { ok: true, value: undefined };
    } catch (error) {
      return {
        ok: false,
        error: {
          type: 'UPDATE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  async getEventLog(specId: string): Promise<Result<EventLogEntry[], EventLogError>> {
    try {
      const result = await window.electronAPI.getEventLog(specId);
      return result;
    } catch (error) {
      return {
        ok: false,
        error: {
          type: 'IO_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  async startImpl(
    specId: string,
    featureName: string,
    commandPrefix?: string
  ): Promise<Result<{ agentId: string }, ImplStartError>> {
    try {
      const result = await window.electronAPI.startImpl(
        specId,
        featureName,
        commandPrefix ?? this.commandPrefix
      );
      return result;
    } catch (error) {
      return {
        ok: false,
        error: {
          type: 'EXECUTE_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  async parseTasksForParallel(specName: string): Promise<ParseResult | null> {
    try {
      return await window.electronAPI.parseTasksForParallel(specName);
    } catch (error) {
      console.error('Failed to parse tasks for parallel:', error);
      return null;
    }
  }

  async executePhaseWithOptions(
    specId: string,
    phase: string,
    options: ExecutePhaseOptions
  ): Promise<Result<AgentInfo, ApiError>> {
    try {
      const executeParams: {
        type: string;
        specId: string;
        featureName: string;
        commandPrefix: 'kiro' | 'spec-manager';
        reviewNumber?: number;
        roundNumber?: number;
        taskId?: string;
      } = {
        type: phase,
        specId,
        featureName: specId,
        commandPrefix: options.commandPrefix ?? this.commandPrefix,
      };

      if (options.reviewNumber !== undefined) {
        executeParams.reviewNumber = options.reviewNumber;
      }
      if (options.roundNumber !== undefined) {
        executeParams.roundNumber = options.roundNumber;
      }
      if (options.taskId !== undefined) {
        executeParams.taskId = options.taskId;
      }

      const result = await window.electronAPI.execute(executeParams as Parameters<typeof window.electronAPI.execute>[0]);

      return {
        ok: true,
        value: {
          id: result.agentId,
          specId,
          phase,
          status: 'running',
          startedAt: Date.now(),
        },
      };
    } catch (error) {
      return {
        ok: false,
        error: {
          type: 'EXECUTE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let instance: ElectronSpecWorkflowApi | null = null;

/**
 * ElectronSpecWorkflowApiのシングルトンインスタンスを取得
 */
export function getElectronSpecWorkflowApi(): ElectronSpecWorkflowApi {
  if (!instance) {
    instance = new ElectronSpecWorkflowApi();
  }
  return instance;
}
