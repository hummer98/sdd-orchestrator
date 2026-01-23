/**
 * MetricsFileReader Service
 * Handles reading metrics records from JSONL file
 * Task 1.3: Metrics file reading service
 * Requirements: 7.4
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { logger } from './logger';
import {
  MetricRecordSchema,
  METRICS_FILE_PATH,
  type MetricRecord,
} from '../types/metrics';

// =============================================================================
// MetricsFileReader
// =============================================================================

/**
 * Service for reading metrics records from JSONL file
 * Requirements: 7.4
 */
export class MetricsFileReader {
  /**
   * Get the full path to the metrics file for a project
   *
   * @param projectPath - Project root path
   * @returns Full path to metrics.jsonl
   */
  getFilePath(projectPath: string): string {
    return join(projectPath, METRICS_FILE_PATH);
  }

  /**
   * Read all valid metrics records from file
   * Requirements: 7.4 - Skip invalid entries, log errors
   *
   * @param projectPath - Project root path
   * @returns Array of valid MetricRecord objects
   */
  async readAllRecords(projectPath: string): Promise<MetricRecord[]> {
    const filePath = this.getFilePath(projectPath);
    const records: MetricRecord[] = [];

    try {
      const content = await readFile(filePath, 'utf-8');

      if (!content.trim()) {
        return [];
      }

      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        try {
          // Parse JSON
          const parsed = JSON.parse(line);

          // Validate against schema
          const result = MetricRecordSchema.safeParse(parsed);
          if (result.success) {
            records.push(result.data);
          } else {
            // Log schema validation error but continue
            logger.warn('[MetricsFileReader] Skipping invalid record', {
              line: i + 1,
              errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
            });
          }
        } catch (parseError) {
          // Log JSON parse error but continue
          logger.warn('[MetricsFileReader] Skipping invalid JSON line', {
            line: i + 1,
            error: parseError instanceof Error ? parseError.message : String(parseError),
          });
        }
      }

      return records;
    } catch (error) {
      // Handle file not found - return empty array
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }

      // Log other errors
      logger.error('[MetricsFileReader] Failed to read metrics file', {
        path: filePath,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Read metrics records for a specific spec
   * Requirements: 7.4
   *
   * @param projectPath - Project root path
   * @param specId - Spec identifier to filter by
   * @returns Array of MetricRecord objects for the specified spec
   */
  async readRecordsForSpec(projectPath: string, specId: string): Promise<MetricRecord[]> {
    const allRecords = await this.readAllRecords(projectPath);
    return allRecords.filter((record) => record.spec === specId);
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let defaultMetricsFileReader: MetricsFileReader | null = null;

/**
 * Get the default MetricsFileReader instance
 */
export function getDefaultMetricsFileReader(): MetricsFileReader {
  if (!defaultMetricsFileReader) {
    defaultMetricsFileReader = new MetricsFileReader();
  }
  return defaultMetricsFileReader;
}
