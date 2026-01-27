/**
 * OrphanDetector Service
 * agent-stale-recovery: Task 4.1 - Orphan agent detection on project load
 * Requirements: 1.1, 1.2, 1.3, 1.4
 *
 * Detects orphan agents (status:running but process not alive) on project load
 * and triggers recovery processing.
 */

import { AgentRecordService, AgentRecord } from '../agentRecordService';
import { RecoveryEngine } from './RecoveryEngine';

/**
 * OrphanDetector Service
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */
export class OrphanDetector {
  private recordService: AgentRecordService;
  private recoveryEngine: RecoveryEngine;

  constructor(recordService: AgentRecordService, recoveryEngine: RecoveryEngine) {
    this.recordService = recordService;
    this.recoveryEngine = recoveryEngine;
  }

  /**
   * Detect orphan agents and trigger recovery
   * Requirements: 1.1, 1.2, 1.3, 1.4
   *
   * Orphan agent criteria:
   * - status: running
   * - process not alive (checkProcessAlive returns false)
   *
   * @param projectPath - Project root path (for logging context)
   */
  async detectOrphans(projectPath: string): Promise<void> {
    console.log(`[OrphanDetector] Starting orphan detection for project: ${projectPath}`);

    try {
      // Read all agent records
      // Requirements: 1.1
      const allRecords: AgentRecord[] = await this.recordService.readAllRecords();

      let orphansDetected = 0;
      let orphansRecovered = 0;

      for (const record of allRecords) {
        // Check if agent is running
        // Requirements: 1.2
        if (record.status !== 'running') {
          continue;
        }

        // Check if process is alive
        // Requirements: 1.2
        const isAlive = this.recordService.checkProcessAlive(record.pid);

        if (!isAlive) {
          // Orphan detected
          orphansDetected++;
          console.log(
            `[OrphanDetector] Orphan detected: ${record.agentId} (spec: ${record.specId}, pid: ${record.pid})`
          );

          try {
            // Trigger recovery
            // Requirements: 1.3
            const result = await this.recoveryEngine.recoverAgent(record);

            console.log(
              `[OrphanDetector] Recovery result for ${record.agentId}: ${result.action}` +
                (result.reason ? ` (${result.reason})` : '')
            );

            orphansRecovered++;
          } catch (error) {
            // Log error but continue with other orphans
            console.error(
              `[OrphanDetector] Failed to recover orphan ${record.agentId}:`,
              error
            );
          }
        }
      }

      // Log detection results
      // Requirements: 1.4
      if (orphansDetected > 0) {
        console.log(
          `[OrphanDetector] Orphan detection complete: ${orphansDetected} detected, ${orphansRecovered} recovered`
        );
      } else {
        console.log(`[OrphanDetector] No orphan agents detected`);
      }
    } catch (error) {
      console.error(`[OrphanDetector] Orphan detection failed:`, error);
      throw error;
    }
  }
}
