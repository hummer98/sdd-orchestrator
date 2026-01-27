/**
 * MetricsService
 * Core service for metrics measurement
 * Task 2.1: Metrics service core implementation
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.12, 3.1, 3.2, 3.3
 */

import { logger } from './logger';
import { MetricsFileWriter, getDefaultMetricsFileWriter } from './metricsFileWriter';
import { MetricsFileReader, getDefaultMetricsFileReader } from './metricsFileReader';
import type {
  AgentPhase,
  CoreWorkflowPhase,
  HumanSessionData,
  AiMetricRecord,
  HumanMetricRecord,
  LifecycleMetricRecord,
  SpecMetrics,
  PhaseMetricsMap,
  PhaseStatus,
  ProjectMetrics,
} from '../types/metrics';

// =============================================================================
// Internal Types
// =============================================================================

/**
 * Internal representation of active spec lifecycle
 */
interface InternalLifecycle {
  specId: string;
  startTimestamp: string;
}

// =============================================================================
// MetricsService
// =============================================================================

/**
 * Core service for metrics measurement
 * Coordinates AI session, human session, and lifecycle tracking
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.12, 3.1, 3.2, 3.3
 */
export class MetricsService {
  private projectPath: string | null = null;
  private writer: MetricsFileWriter;
  private reader: MetricsFileReader;

  // Active session tracking
  private activeLifecycles: Map<string, InternalLifecycle> = new Map();

  constructor(writer?: MetricsFileWriter, reader?: MetricsFileReader) {
    this.writer = writer ?? getDefaultMetricsFileWriter();
    this.reader = reader ?? getDefaultMetricsFileReader();
  }

  /**
   * Set the current project path
   * Clears all active sessions when changing projects
   */
  setProjectPath(projectPath: string): void {
    this.projectPath = projectPath;
    // Clear active sessions when project changes
    this.activeLifecycles.clear();
  }

  /**
   * Get current project path
   */
  getProjectPath(): string | null {
    return this.projectPath;
  }

  // ===========================================================================
  // File-based AI Metrics (metrics-file-based-tracking)
  // Requirements: 3.1, 3.2, 3.3
  // ===========================================================================

  /**
   * Record AI session from agent record executions data
   * metrics-file-based-tracking: Task 3.2 - Direct file-based metrics recording
   * Requirements: 3.2, 3.3
   *
   * This method writes AI metrics directly from agent record data,
   * bypassing the in-memory session tracking used by startAiSession/endAiSession.
   *
   * @param specId - The spec ID
   * @param phase - The workflow phase
   * @param start - Session start timestamp (ISO 8601)
   * @param end - Session end timestamp (ISO 8601)
   */
  async recordAiSessionFromFile(
    specId: string,
    phase: AgentPhase,
    start: string,
    end: string
  ): Promise<void> {
    if (!this.projectPath) {
      logger.warn('[MetricsService] Cannot record AI session from file: no project path set');
      return;
    }

    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const ms = endTime - startTime;

    const record: AiMetricRecord = {
      type: 'ai',
      spec: specId,
      phase,
      start,
      end,
      ms,
    };

    await this.writer.appendRecord(this.projectPath, record);
    logger.debug('[MetricsService] AI session recorded from file', { specId, phase, ms });
  }

  // ===========================================================================
  // Human Session Management (Requirement 2.12)
  // ===========================================================================

  /**
   * Record a completed human session
   * Requirement 2.12: Persist human consumption time
   */
  async recordHumanSession(session: HumanSessionData): Promise<void> {
    if (!this.projectPath) {
      logger.warn('[MetricsService] Cannot record human session: no project path set');
      return;
    }

    const record: HumanMetricRecord = {
      type: 'human',
      spec: session.specId,
      start: session.start,
      end: session.end,
      ms: session.ms,
    };

    await this.writer.appendRecord(this.projectPath, record);
    logger.debug('[MetricsService] Human session recorded', {
      specId: session.specId,
      ms: session.ms,
    });
  }

  // ===========================================================================
  // Spec Lifecycle Management (Requirements 3.1, 3.2, 3.3)
  // ===========================================================================

  /**
   * Start spec lifecycle tracking
   * Requirement 3.1: Record spec-init start timestamp
   */
  async startSpecLifecycle(specId: string): Promise<void> {
    const timestamp = new Date().toISOString();

    // Track locally
    this.activeLifecycles.set(specId, {
      specId,
      startTimestamp: timestamp,
    });

    // Persist start event
    if (this.projectPath) {
      const record: LifecycleMetricRecord = {
        type: 'lifecycle',
        spec: specId,
        event: 'start',
        timestamp,
      };

      await this.writer.appendRecord(this.projectPath, record);
      logger.debug('[MetricsService] Spec lifecycle started', { specId, timestamp });
    }
  }

  /**
   * Complete spec lifecycle tracking
   * Requirements 3.2, 3.3: Record completion, calculate total, persist
   */
  async completeSpecLifecycle(specId: string): Promise<void> {
    const lifecycle = this.activeLifecycles.get(specId);

    if (!lifecycle) {
      logger.warn('[MetricsService] No active lifecycle to complete', { specId });
      return;
    }

    const timestamp = new Date().toISOString();
    const startTime = new Date(lifecycle.startTimestamp).getTime();
    const endTime = new Date(timestamp).getTime();
    const totalMs = endTime - startTime;

    // Remove from active lifecycles
    this.activeLifecycles.delete(specId);

    // Persist complete event
    if (this.projectPath) {
      const record: LifecycleMetricRecord = {
        type: 'lifecycle',
        spec: specId,
        event: 'complete',
        timestamp,
        totalMs,
      };

      await this.writer.appendRecord(this.projectPath, record);
      logger.debug('[MetricsService] Spec lifecycle completed', { specId, totalMs });
    }
  }

  /**
   * Get active lifecycle for a spec
   */
  getActiveLifecycle(specId: string): { specId: string; startTimestamp: string } | undefined {
    return this.activeLifecycles.get(specId);
  }

  // ===========================================================================
  // Metrics Aggregation
  // ===========================================================================

  /**
   * Check if a phase is a core workflow phase
   */
  private isCorePhase(phase: string): phase is CoreWorkflowPhase {
    return ['requirements', 'design', 'tasks', 'impl'].includes(phase);
  }

  /**
   * Get aggregated metrics for a spec
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
   * Now includes all agent phases (auto-impl, inspection, document-review, etc.) in totalAiTimeMs
   */
  async getMetricsForSpec(specId: string): Promise<SpecMetrics> {
    if (!this.projectPath) {
      return this.createEmptyMetrics(specId);
    }

    const records = await this.reader.readRecordsForSpec(this.projectPath, specId);

    // Use mutable internal structure for accumulation (core phases only for phaseMetrics)
    type MutablePhaseMetrics = { aiTimeMs: number; humanTimeMs: number; status: PhaseStatus };
    const phaseAccumulators: Record<CoreWorkflowPhase, MutablePhaseMetrics> = {
      requirements: { aiTimeMs: 0, humanTimeMs: 0, status: 'pending' },
      design: { aiTimeMs: 0, humanTimeMs: 0, status: 'pending' },
      tasks: { aiTimeMs: 0, humanTimeMs: 0, status: 'pending' },
      impl: { aiTimeMs: 0, humanTimeMs: 0, status: 'pending' },
    };

    let totalAiTimeMs = 0;
    let totalHumanTimeMs = 0;
    let totalElapsedMs: number | null = null;
    let hasComplete = false;

    for (const record of records) {
      switch (record.type) {
        case 'ai':
          // Always add to total AI time (all phases including auto-impl, inspection, etc.)
          totalAiTimeMs += record.ms;
          // Only accumulate to phaseMetrics for core phases (for UI display)
          if (this.isCorePhase(record.phase)) {
            phaseAccumulators[record.phase].aiTimeMs += record.ms;
            // Mark phase as completed if we have AI time for it
            if (phaseAccumulators[record.phase].status === 'pending') {
              phaseAccumulators[record.phase].status = 'completed';
            }
          }
          break;

        case 'human':
          totalHumanTimeMs += record.ms;
          // Note: Human time is not phase-specific in current design
          break;

        case 'lifecycle':
          if (record.event === 'complete' && record.totalMs !== undefined) {
            totalElapsedMs = record.totalMs;
            hasComplete = true;
          }
          break;
      }
    }

    // Convert to immutable PhaseMetricsMap
    const phaseMetrics: PhaseMetricsMap = {
      requirements: { ...phaseAccumulators.requirements },
      design: { ...phaseAccumulators.design },
      tasks: { ...phaseAccumulators.tasks },
      impl: { ...phaseAccumulators.impl },
    };

    return {
      specId,
      totalAiTimeMs,
      totalHumanTimeMs,
      totalElapsedMs,
      phaseMetrics,
      status: hasComplete ? 'completed' : 'in-progress',
    };
  }

  /**
   * Get project-wide aggregated metrics
   * Requirements: 8.1, 8.2, 8.3 (Optional)
   */
  async getProjectMetrics(): Promise<ProjectMetrics> {
    if (!this.projectPath) {
      return {
        totalAiTimeMs: 0,
        totalHumanTimeMs: 0,
        completedSpecCount: 0,
        inProgressSpecCount: 0,
      };
    }

    const records = await this.reader.readAllRecords(this.projectPath);

    let totalAiTimeMs = 0;
    let totalHumanTimeMs = 0;
    const completedSpecs = new Set<string>();
    const allSpecs = new Set<string>();

    for (const record of records) {
      allSpecs.add(record.spec);

      switch (record.type) {
        case 'ai':
          totalAiTimeMs += record.ms;
          break;

        case 'human':
          totalHumanTimeMs += record.ms;
          break;

        case 'lifecycle':
          if (record.event === 'complete') {
            completedSpecs.add(record.spec);
          }
          break;
      }
    }

    return {
      totalAiTimeMs,
      totalHumanTimeMs,
      completedSpecCount: completedSpecs.size,
      inProgressSpecCount: allSpecs.size - completedSpecs.size,
    };
  }

  /**
   * Create empty metrics for a spec with no data
   */
  private createEmptyMetrics(specId: string): SpecMetrics {
    return {
      specId,
      totalAiTimeMs: 0,
      totalHumanTimeMs: 0,
      totalElapsedMs: null,
      phaseMetrics: {
        requirements: { aiTimeMs: 0, humanTimeMs: 0, status: 'pending' },
        design: { aiTimeMs: 0, humanTimeMs: 0, status: 'pending' },
        tasks: { aiTimeMs: 0, humanTimeMs: 0, status: 'pending' },
        impl: { aiTimeMs: 0, humanTimeMs: 0, status: 'pending' },
      },
      status: 'in-progress',
    };
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let defaultMetricsService: MetricsService | null = null;

/**
 * Get the default MetricsService instance
 */
export function getDefaultMetricsService(): MetricsService {
  if (!defaultMetricsService) {
    defaultMetricsService = new MetricsService();
  }
  return defaultMetricsService;
}

/**
 * Initialize the default MetricsService with a project path
 */
export function initDefaultMetricsService(projectPath: string): MetricsService {
  const service = getDefaultMetricsService();
  service.setProjectPath(projectPath);
  return service;
}
