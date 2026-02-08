/**
 * Project State SSOT
 * Moves shared state out of projectSetup.ts to break circular dependencies
 */

import { type SpecManagerService } from '../../services/specManagerService';
import { type AutoExecutionCoordinator } from '../../services/autoExecutionCoordinator';
import { type MetricsService } from '../../services/metricsService';
import type { SelectProjectResult } from '../../../renderer/types';

let specManagerService: SpecManagerService | null = null;
let autoExecutionCoordinator: AutoExecutionCoordinator | null = null;
let metricsService: MetricsService | null = null;
let initialProjectPath: string | null = null;
let currentProjectPath: string | null = null;
let initialSelectResult: SelectProjectResult | null = null;

// ============================================================
// Getters / Setters
// ============================================================

export function getSpecManagerService(): SpecManagerService {
  if (!specManagerService) throw new Error('SpecManagerService not initialized. Call setProjectPath first.');
  return specManagerService;
}

export function setSpecManagerService(service: SpecManagerService | null): void {
  specManagerService = service;
}

export function getAutoExecutionCoordinator(): AutoExecutionCoordinator {
  if (!autoExecutionCoordinator) throw new Error('AutoExecutionCoordinator not initialized.');
  return autoExecutionCoordinator;
}

export function setAutoExecutionCoordinator(coordinator: AutoExecutionCoordinator | null): void {
  autoExecutionCoordinator = coordinator;
}

export function getMetricsService(): MetricsService {
  if (!metricsService) throw new Error('MetricsService not initialized. Call setProjectPath first.');
  return metricsService;
}

export function setMetricsService(service: MetricsService | null): void {
  metricsService = service;
}

export function getCurrentProjectPath(): string | null {
  return currentProjectPath;
}

export function setCurrentProjectPath(path: string | null): void {
  currentProjectPath = path;
}

export function getInitialProjectPath(): string | null {
  return initialProjectPath;
}

export function setInitialProjectPath(path: string | null): void {
  initialProjectPath = path;
}

export function getInitialSelectResult(): SelectProjectResult | null {
  return initialSelectResult;
}

export function setInitialSelectResult(result: SelectProjectResult | null): void {
  initialSelectResult = result;
}

export function clearInitialSelectResult(): void {
  initialSelectResult = null;
}
