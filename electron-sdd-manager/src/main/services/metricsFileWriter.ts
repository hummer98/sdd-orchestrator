/**
 * MetricsFileWriter Service
 * Handles writing metrics records to JSONL file
 * Task 1.2: Metrics file writing service
 * Requirements: 4.1, 4.2
 */

import { appendFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { logger } from './logger';
import {
  MetricRecordSchema,
  METRICS_FILE_PATH,
  type MetricRecord,
} from '../types/metrics';

// =============================================================================
// MetricsFileWriter
// =============================================================================

/**
 * Service for writing metrics records to JSONL file
 * Requirements: 4.1, 4.2
 */
export class MetricsFileWriter {
  /**
   * Get the full path to the metrics file for a project
   * Requirements: 4.1 - SSOT location
   *
   * @param projectPath - Project root path
   * @returns Full path to metrics.jsonl
   */
  getFilePath(projectPath: string): string {
    return join(projectPath, METRICS_FILE_PATH);
  }

  /**
   * Append a metric record to the JSONL file
   * Requirements: 4.1, 4.2
   *
   * - Creates .kiro directory if it doesn't exist
   * - Validates record using Zod schema
   * - Appends record as single line JSON with newline
   *
   * @param projectPath - Project root path
   * @param record - Metric record to append
   * @throws Error if validation fails or write fails
   */
  async appendRecord(projectPath: string, record: MetricRecord): Promise<void> {
    // Validate record with Zod schema
    const parseResult = MetricRecordSchema.safeParse(record);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      throw new Error(`Invalid metric record: ${errorMessage}`);
    }

    const filePath = this.getFilePath(projectPath);

    try {
      // Ensure directory exists
      await mkdir(dirname(filePath), { recursive: true });

      // Convert to single-line JSON and append with newline
      const jsonLine = JSON.stringify(parseResult.data) + '\n';
      await appendFile(filePath, jsonLine, 'utf-8');

      logger.debug('[MetricsFileWriter] Record appended', {
        type: record.type,
        spec: record.spec,
      });
    } catch (error) {
      logger.error('[MetricsFileWriter] Failed to append record', {
        path: filePath,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let defaultMetricsFileWriter: MetricsFileWriter | null = null;

/**
 * Get the default MetricsFileWriter instance
 */
export function getDefaultMetricsFileWriter(): MetricsFileWriter {
  if (!defaultMetricsFileWriter) {
    defaultMetricsFileWriter = new MetricsFileWriter();
  }
  return defaultMetricsFileWriter;
}
