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
import { DEFAULT_LLM_ENGINE } from '@shared/registry';
// trpc-full-migration Task 4.3: Use tRPC vanilla client for file operations
import { getVanillaClient } from '../../shared/trpc/vanillaClient';

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
      // trpc-full-migration Task 5.3: Use tRPC for execute
      const result = await getVanillaClient().spec.execute.mutate({
        type: phase as 'requirements' | 'design' | 'tasks' | 'impl' | 'inspection' | 'deploy',
        specId,
        featureName: specId,
        commandPrefix: this.commandPrefix,
      });

      return {
        ok: true,
        value: {
          agentId: result.agentId,
          specId,
          phase,
          status: 'running',
          startedAt: Date.now(),
          engineId: result.engineId ?? DEFAULT_LLM_ENGINE,
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
      // trpc-full-migration Task 5.3: Use tRPC for updateApproval
      await getVanillaClient().spec.updateApproval.mutate({ specName: specId, phase, approved });
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
      // trpc-full-migration Task 5.3: Use tRPC for execute (document-review)
      const result = await getVanillaClient().spec.execute.mutate({
        type: 'document-review',
        specId,
        featureName: specId,
        commandPrefix: this.commandPrefix,
      });

      return {
        ok: true,
        value: {
          agentId: result.agentId,
          specId,
          phase: 'document-review',
          status: 'running',
          startedAt: Date.now(),
          engineId: result.engineId ?? DEFAULT_LLM_ENGINE,
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
      // trpc-full-migration Task 5.3: Use tRPC for execute (inspection)
      const result = await getVanillaClient().spec.execute.mutate({
        type: 'inspection',
        specId,
        featureName: specId,
        commandPrefix: this.commandPrefix,
      });

      return {
        ok: true,
        value: {
          agentId: result.agentId,
          specId,
          phase: 'inspection',
          status: 'running',
          startedAt: Date.now(),
          engineId: result.engineId ?? DEFAULT_LLM_ENGINE,
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

  // trpc-full-migration Task 7.2: Use tRPC vanilla client for autoExecution operations
  async startAutoExecution(
    projectPath: string,
    specPath: string,
    specId: string,
    options: AutoExecutionOptions
  ): Promise<Result<AutoExecutionState, ApiError>> {
    try {
      const result = await getVanillaClient().autoExecution.start.mutate({
        projectPath,
        specPath: specPath || specId,
        specId,
        options: {
          permissions: {
            requirements: options.permissions.requirements ?? true,
            design: options.permissions.design ?? true,
            tasks: options.permissions.tasks ?? true,
            'document-review': options.permissions['document-review'] ?? true,
            impl: options.permissions.impl ?? false,
            inspection: options.permissions.inspection ?? true,
            deploy: options.permissions.deploy ?? false,
          },
        },
      });
      // tRPC infers generic types from router; cast to concrete types
      const typedResult = result as
        | { ok: true; value: { status: string; currentPhase?: string | null; executedPhases: string[] } }
        | { ok: false; error: { type: string; message?: string } };

      if (typedResult.ok) {
        return {
          ok: true,
          value: {
            status: typedResult.value.status as AutoExecutionState['status'],
            currentPhase: (typedResult.value.currentPhase ?? undefined) as WorkflowPhase | undefined,
            completedPhases: typedResult.value.executedPhases as WorkflowPhase[],
          },
        };
      }
      return {
        ok: false,
        error: {
          type: typedResult.error.type,
          message: typedResult.error.message ?? 'Unknown error',
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

  // trpc-full-migration Task 7.2: Use tRPC vanilla client for autoExecution stop
  async stopAutoExecution(specPath: string): Promise<Result<void, ApiError>> {
    try {
      const result = await getVanillaClient().autoExecution.stop.mutate({ specPath });
      // tRPC infers generic types from router; cast to concrete types
      const typedResult = result as
        | { ok: true; value?: unknown }
        | { ok: false; error: { type: string; message?: string } };

      if (typedResult.ok) {
        return { ok: true, value: undefined };
      }
      return {
        ok: false,
        error: {
          type: typedResult.error.type,
          message: typedResult.error.message ?? 'Unknown error',
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
      // trpc-full-migration Task 4.3: Use tRPC for readSpecJson
      const specJson = await getVanillaClient().file.readSpecJson.query({ specName: specId });

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
        parallelTaskInfo: null,
      };

      // アーティファクトを読み込み
      try {
        // trpc-full-migration Task 4.3: Use tRPC for readArtifact
        const requirementsContent = await getVanillaClient().file.readArtifact.query({ name: specId, filename: 'requirements.md', entityType: 'spec' });
        specDetail.artifacts.requirements = {
          exists: true,
          updatedAt: specJson.updated_at ?? null,
          content: requirementsContent,
        };
      } catch {
        // 存在しない場合は無視
      }

      try {
        const designContent = await getVanillaClient().file.readArtifact.query({ name: specId, filename: 'design.md', entityType: 'spec' });
        specDetail.artifacts.design = {
          exists: true,
          updatedAt: specJson.updated_at ?? null,
          content: designContent,
        };
      } catch {
        // 存在しない場合は無視
      }

      try {
        const tasksContent = await getVanillaClient().file.readArtifact.query({ name: specId, filename: 'tasks.md', entityType: 'spec' });
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
      // trpc-full-migration Task 5.3: Use tRPC for updateSpecJson
      await getVanillaClient().spec.updateSpecJson.mutate({ specName: specId, updates });
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
      // trpc-full-migration Task 5.3: Use tRPC for getEventLog
      // trpc-full-migration: Cast result (tRPC infers wider string type for error.type)
      const result = await getVanillaClient().spec.getEventLog.query({ specId });
      return result as Result<EventLogEntry[], EventLogError>;
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
      // trpc-full-migration Task 5.3: Use tRPC for startImpl
      // trpc-full-migration: Cast result (tRPC infers wider string type for error.type)
      const result = await getVanillaClient().spec.startImpl.mutate({
        specName: specId,
        featureName,
        commandPrefix: commandPrefix ?? this.commandPrefix,
      });
      return result as Result<{ agentId: string }, ImplStartError>;
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
      // trpc-full-migration Task 5.3: Use tRPC for parseTasksForParallel
      return await getVanillaClient().spec.parseTasksForParallel.query({ specName });
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

      // trpc-full-migration Task 5.3: Use tRPC for execute (with options)
      const result = await getVanillaClient().spec.execute.mutate(executeParams as any);

      return {
        ok: true,
        value: {
          agentId: result.agentId,
          specId,
          phase,
          status: 'running',
          startedAt: Date.now(),
          engineId: result.engineId ?? DEFAULT_LLM_ENGINE,
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
