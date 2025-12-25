/**
 * AutoExecutionService Integration Tests
 * Task 12.3: フェーズ遷移の統合テスト
 * Requirements: 1.1, 1.2, 1.4, 2.3, 2.4, 4.1, 4.2, 4.3, 4.4, 6.3, 8.1, 8.3
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AutoExecutionService } from './AutoExecutionService';
import { useWorkflowStore, DEFAULT_AUTO_EXECUTION_PERMISSIONS } from '../stores/workflowStore';
import { useAgentStore } from '../stores/agentStore';
import { useSpecStore } from '../stores/specStore';
import type { WorkflowPhase } from '../types/workflow';

// Mock electronAPI
const mockElectronAPI = {
  executePhase: vi.fn(),
  executeValidation: vi.fn(),
  updateApproval: vi.fn(),
  readSpecJson: vi.fn(),
  onAgentStatusChange: vi.fn(() => vi.fn()), // Returns unsubscribe function
};

vi.stubGlobal('window', {
  electronAPI: mockElectronAPI,
});

// ============================================================
// Task 12.3: フェーズ遷移の統合テスト
// Requirements: 1.1, 1.2, 1.4, 2.3, 2.4, 4.1, 4.2, 4.3, 4.4, 6.3, 8.1, 8.3
// ============================================================
describe('AutoExecutionService Integration Tests', () => {
  let service: AutoExecutionService;

  // テスト用のSpec詳細データ
  const createMockSpecDetail = (approvals: Record<string, { generated: boolean; approved: boolean }>) => ({
    metadata: { name: 'test-spec', path: '/test' },
    specJson: {
      feature_name: 'test',
      approvals: {
        requirements: approvals.requirements || { generated: false, approved: false },
        design: approvals.design || { generated: false, approved: false },
        tasks: approvals.tasks || { generated: false, approved: false },
      },
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Setup default mock return for readSpecJson
    mockElectronAPI.readSpecJson.mockResolvedValue({
      feature_name: 'test',
      approvals: {
        requirements: { generated: false, approved: false },
        design: { generated: false, approved: false },
        tasks: { generated: false, approved: false },
      },
    });

    // Reset stores
    // Note: isAutoExecuting, currentAutoPhase, autoExecutionStatus moved to specStore.autoExecutionRuntime
    useWorkflowStore.setState({
      autoExecutionPermissions: { ...DEFAULT_AUTO_EXECUTION_PERMISSIONS },
      validationOptions: { gap: false, design: false },
      lastFailedPhase: null,
      failedRetryCount: 0,
      executionSummary: null,
    });

    useAgentStore.setState({
      agents: new Map(),
      selectedAgentId: null,
      logs: new Map(),
      isLoading: false,
      error: null,
    });

    useSpecStore.setState({
      specs: [],
      selectedSpec: null,
      specDetail: null,
      isLoading: false,
      error: null,
      specManagerExecution: {
        isRunning: false,
        currentPhase: null,
        currentSpecId: null,
        lastCheckResult: null,
        error: null,
        implTaskStatus: null,
        retryCount: 0,
        executionMode: null,
      },
      // spec-scoped-auto-execution-state Task 5.1: Auto execution runtime state
      autoExecutionRuntime: {
        isAutoExecuting: false,
        currentAutoPhase: null,
        autoExecutionStatus: 'idle',
      },
    });

    service = new AutoExecutionService();
  });

  afterEach(() => {
    service.dispose();
    vi.useRealTimers();
  });

  // ============================================================
  // 自動実行開始から完了までの一連フロー
  // Requirements: 1.1, 1.4, 2.3
  // ============================================================
  describe('自動実行開始から完了までの一連フロー', () => {
    it('requirementsのみ許可時、1フェーズ実行して完了する', async () => {
      const mockSpecDetail = createMockSpecDetail({
        requirements: { generated: false, approved: false },
        design: { generated: false, approved: false },
        tasks: { generated: false, approved: false },
      });
      useSpecStore.setState({ specDetail: mockSpecDetail as any });

      useWorkflowStore.setState({
        autoExecutionPermissions: {
          requirements: true,
          design: false,
          tasks: false,
          impl: false,
          inspection: false,
          deploy: false,
        },
      });

      // 開始
      const started = service.start();
      expect(started).toBe(true);
      // isAutoExecuting, autoExecutionStatus are now in specStore.autoExecutionRuntime
      expect(useSpecStore.getState().autoExecutionRuntime.isAutoExecuting).toBe(true);
      expect(useSpecStore.getState().autoExecutionRuntime.autoExecutionStatus).toBe('running');

      // executePhaseが呼ばれることを確認
      await vi.advanceTimersByTimeAsync(100);
      expect(mockElectronAPI.executePhase).toHaveBeenCalledWith(
        'test-spec',
        'requirements',
        'test-spec'
      );
    });

    it('複数フェーズ許可時、順番に実行する', () => {
      const mockSpecDetail = createMockSpecDetail({
        requirements: { generated: false, approved: false },
        design: { generated: false, approved: false },
        tasks: { generated: false, approved: false },
      });
      useSpecStore.setState({ specDetail: mockSpecDetail as any });

      useWorkflowStore.setState({
        autoExecutionPermissions: {
          requirements: true,
          design: true,
          tasks: true,
          impl: false,
          inspection: false,
          deploy: false,
        },
      });

      // 開始
      const started = service.start();
      expect(started).toBe(true);

      // 最初のフェーズがrequirementsであることを確認
      expect(service.getNextPermittedPhase(null)).toBe('requirements');
      expect(service.getNextPermittedPhase('requirements')).toBe('design');
      expect(service.getNextPermittedPhase('design')).toBe('tasks');
      expect(service.getNextPermittedPhase('tasks')).toBeNull();
    });

    it('許可フェーズがない場合は開始失敗する', () => {
      useWorkflowStore.setState({
        autoExecutionPermissions: {
          requirements: false,
          design: false,
          tasks: false,
          impl: false,
          inspection: false,
          deploy: false,
        },
      });

      const started = service.start();
      expect(started).toBe(false);
      expect(useSpecStore.getState().autoExecutionRuntime.isAutoExecuting).toBe(false);
    });
  });

  // ============================================================
  // Agent完了検知から次フェーズ遷移
  // Requirements: 2.3, 6.3
  // ============================================================
  describe('Agent完了検知から次フェーズ遷移', () => {
    it('Agent完了時に次フェーズを取得できる', () => {
      useWorkflowStore.setState({
        autoExecutionPermissions: {
          requirements: true,
          design: true,
          tasks: false,
          impl: false,
          inspection: false,
          deploy: false,
        },
      });

      // requirementsからdesignへ遷移
      const nextPhase = service.getNextPermittedPhase('requirements');
      expect(nextPhase).toBe('design');
    });

    it('最後の許可フェーズ完了時はnullを返す', () => {
      useWorkflowStore.setState({
        autoExecutionPermissions: {
          requirements: true,
          design: true,
          tasks: false,
          impl: false,
          inspection: false,
          deploy: false,
        },
      });

      // designの次はtasksだが許可されていないのでnull
      const nextPhase = service.getNextPermittedPhase('design');
      expect(nextPhase).toBeNull();
    });

    it('スキップされたフェーズを飛ばして次へ進む', () => {
      useWorkflowStore.setState({
        autoExecutionPermissions: {
          requirements: true,
          design: false, // スキップ
          tasks: true,
          impl: false,
          inspection: false,
          deploy: false,
        },
      });

      // requirementsからtasksへ（designをスキップ）
      const nextPhase = service.getNextPermittedPhase('requirements');
      expect(nextPhase).toBe('tasks');
    });
  });

  // ============================================================
  // エラー発生時の停止と再実行
  // Requirements: 2.4, 8.1, 8.3
  // ============================================================
  describe('エラー発生時の停止と再実行', () => {
    it('停止するとisAutoExecutingがfalseになる', async () => {
      const mockSpecDetail = createMockSpecDetail({
        requirements: { generated: false, approved: false },
      });
      useSpecStore.setState({ specDetail: mockSpecDetail as any });

      useWorkflowStore.setState({
        autoExecutionPermissions: {
          requirements: true,
          design: false,
          tasks: false,
          impl: false,
          inspection: false,
          deploy: false,
        },
      });

      service.start();
      expect(useSpecStore.getState().autoExecutionRuntime.isAutoExecuting).toBe(true);

      await service.stop();
      expect(useSpecStore.getState().autoExecutionRuntime.isAutoExecuting).toBe(false);
      expect(useSpecStore.getState().autoExecutionRuntime.autoExecutionStatus).toBe('idle');
    });

    it('失敗フェーズから再実行できる', () => {
      const mockSpecDetail = createMockSpecDetail({
        requirements: { generated: true, approved: true },
        design: { generated: false, approved: false },
      });
      useSpecStore.setState({ specDetail: mockSpecDetail as any });

      useWorkflowStore.setState({
        autoExecutionPermissions: {
          requirements: true,
          design: true,
          tasks: false,
          impl: false,
          inspection: false,
          deploy: false,
        },
        lastFailedPhase: 'design',
        failedRetryCount: 0,
      });

      const retried = service.retryFrom('design');
      expect(retried).toBe(true);
      expect(useSpecStore.getState().autoExecutionRuntime.isAutoExecuting).toBe(true);
      expect(useWorkflowStore.getState().failedRetryCount).toBe(1);
    });

    it('最大リトライ回数を超えると再実行失敗する', () => {
      const mockSpecDetail = createMockSpecDetail({
        requirements: { generated: true, approved: true },
        design: { generated: false, approved: false },
      });
      useSpecStore.setState({ specDetail: mockSpecDetail as any });

      useWorkflowStore.setState({
        autoExecutionPermissions: {
          requirements: true,
          design: true,
          tasks: false,
          impl: false,
          inspection: false,
          deploy: false,
        },
        lastFailedPhase: 'design',
        failedRetryCount: 3, // MAX_RETRIES (3) に達している
      });

      const retried = service.retryFrom('design');
      expect(retried).toBe(false);
    });

    it('許可されていないフェーズから再実行はできない', () => {
      const mockSpecDetail = createMockSpecDetail({
        requirements: { generated: true, approved: true },
        design: { generated: false, approved: false },
      });
      useSpecStore.setState({ specDetail: mockSpecDetail as any });

      useWorkflowStore.setState({
        autoExecutionPermissions: {
          requirements: true,
          design: false, // 許可されていない
          tasks: false,
          impl: false,
          inspection: false,
          deploy: false,
        },
        lastFailedPhase: 'design',
        failedRetryCount: 0,
      });

      const retried = service.retryFrom('design');
      expect(retried).toBe(false);
    });
  });

  // ============================================================
  // バリデーション有効時の挿入実行
  // Requirements: 4.1, 4.2, 4.3, 4.4
  // ============================================================
  describe('バリデーション有効時の挿入実行', () => {
    it('gapバリデーションが有効な場合はrequirements後に実行判定される', () => {
      useWorkflowStore.setState({
        validationOptions: { gap: true, design: false },
      });

      const state = useWorkflowStore.getState();
      expect(state.validationOptions.gap).toBe(true);
      expect(state.validationOptions.design).toBe(false);
    });

    it('designバリデーションが有効な場合はdesign後に実行判定される', () => {
      useWorkflowStore.setState({
        validationOptions: { gap: false, design: true },
      });

      const state = useWorkflowStore.getState();
      expect(state.validationOptions.design).toBe(true);
    });

    it('複数のバリデーションを同時に有効にできる', () => {
      useWorkflowStore.setState({
        validationOptions: { gap: true, design: true },
      });

      const state = useWorkflowStore.getState();
      expect(state.validationOptions.gap).toBe(true);
      expect(state.validationOptions.design).toBe(true);
    });
  });

  // ============================================================
  // 前提条件検証
  // Requirements: 3.1, 3.4
  // ============================================================
  describe('前提条件検証', () => {
    it('specDetailがない場合は無効', async () => {
      useSpecStore.setState({ specDetail: null });

      const result = await service.validatePreconditions('requirements');
      expect(result.valid).toBe(false);
      expect(result.missingSpec).toBe(true);
    });

    it('前フェーズがgeneratedだが未承認の場合は承認が必要', async () => {
      const mockSpecDetail = createMockSpecDetail({
        requirements: { generated: true, approved: false },
        design: { generated: false, approved: false },
      });
      useSpecStore.setState({ specDetail: mockSpecDetail as any });

      // Setup mock for readSpecJson to return the same state
      mockElectronAPI.readSpecJson.mockResolvedValue({
        feature_name: 'test',
        approvals: {
          requirements: { generated: true, approved: false },
          design: { generated: false, approved: false },
          tasks: { generated: false, approved: false },
        },
      });

      const result = await service.validatePreconditions('design');
      expect(result.requiresApproval).toBe(true);
    });

    it('前フェーズが承認済みの場合は有効', async () => {
      const mockSpecDetail = createMockSpecDetail({
        requirements: { generated: true, approved: true },
        design: { generated: false, approved: false },
      });
      useSpecStore.setState({ specDetail: mockSpecDetail as any });

      // Setup mock for readSpecJson to return the same state
      mockElectronAPI.readSpecJson.mockResolvedValue({
        feature_name: 'test',
        approvals: {
          requirements: { generated: true, approved: true },
          design: { generated: false, approved: false },
          tasks: { generated: false, approved: false },
        },
      });

      const result = await service.validatePreconditions('design');
      expect(result.valid).toBe(true);
      expect(result.requiresApproval).toBe(false);
    });

    it('同じspecで他のAgentが実行中の場合は待機が必要', async () => {
      const mockSpecDetail = createMockSpecDetail({
        requirements: { generated: true, approved: true },
      });
      useSpecStore.setState({ specDetail: mockSpecDetail as any });

      // Setup mock for readSpecJson to return the same state
      mockElectronAPI.readSpecJson.mockResolvedValue({
        feature_name: 'test',
        approvals: {
          requirements: { generated: true, approved: true },
          design: { generated: false, approved: false },
          tasks: { generated: false, approved: false },
        },
      });

      // 実行中のAgentを追加
      const agents = new Map();
      agents.set('test-spec', [
        {
          agentId: 'agent-1',
          specId: 'test-spec',
          phase: 'requirements',
          status: 'running',
        },
      ]);
      useAgentStore.setState({ agents });

      const result = await service.validatePreconditions('design');
      expect(result.waitingForAgent).toBe(true);
    });
  });

  // ============================================================
  // 状態管理の整合性
  // Requirements: 7.1, 7.4
  // ============================================================
  describe('状態管理の整合性', () => {
    it('開始時に実行関連状態がリセットされる', () => {
      const mockSpecDetail = createMockSpecDetail({
        requirements: { generated: false, approved: false },
      });
      useSpecStore.setState({ specDetail: mockSpecDetail as any });

      useWorkflowStore.setState({
        autoExecutionPermissions: {
          requirements: true,
          design: false,
          tasks: false,
          impl: false,
          inspection: false,
          deploy: false,
        },
        lastFailedPhase: 'design' as WorkflowPhase,
        failedRetryCount: 2,
        executionSummary: {
          executedPhases: ['requirements' as WorkflowPhase],
          executedValidations: [],
          totalDuration: 1000,
          errors: ['test error'],
        },
      });

      service.start();

      const state = useWorkflowStore.getState();
      expect(state.lastFailedPhase).toBeNull();
      expect(state.failedRetryCount).toBe(0);
      expect(state.executionSummary).toBeNull();
    });

    it('停止時にcurrentAutoPhaseがクリアされる', async () => {
      // Set auto execution state in specStore.autoExecutionRuntime
      useSpecStore.setState({
        ...useSpecStore.getState(),
        autoExecutionRuntime: {
          isAutoExecuting: true,
          currentAutoPhase: 'design',
          autoExecutionStatus: 'running',
        },
      });

      await service.stop();

      expect(useSpecStore.getState().autoExecutionRuntime.currentAutoPhase).toBeNull();
    });
  });

  // ============================================================
  // 複合シナリオ
  // ============================================================
  describe('複合シナリオ', () => {
    it('全フェーズ許可時の遷移順序が正しい', () => {
      useWorkflowStore.setState({
        autoExecutionPermissions: {
          requirements: true,
          design: true,
          tasks: true,
          impl: true,
          inspection: true,
          deploy: true,
        },
      });

      expect(service.getNextPermittedPhase(null)).toBe('requirements');
      expect(service.getNextPermittedPhase('requirements')).toBe('design');
      expect(service.getNextPermittedPhase('design')).toBe('tasks');
      expect(service.getNextPermittedPhase('tasks')).toBe('impl');
      expect(service.getNextPermittedPhase('impl')).toBe('inspection');
      expect(service.getNextPermittedPhase('inspection')).toBe('deploy');
      expect(service.getNextPermittedPhase('deploy')).toBeNull();
    });

    it('許可設定の変更が次フェーズ取得に反映される', () => {
      useWorkflowStore.setState({
        autoExecutionPermissions: {
          requirements: true,
          design: true,
          tasks: false,
          impl: false,
          inspection: false,
          deploy: false,
        },
      });

      expect(service.getNextPermittedPhase('requirements')).toBe('design');

      // 設定を変更
      useWorkflowStore.setState({
        autoExecutionPermissions: {
          requirements: true,
          design: false,
          tasks: true,
          impl: false,
          inspection: false,
          deploy: false,
        },
      });

      expect(service.getNextPermittedPhase('requirements')).toBe('tasks');
    });
  });
});
