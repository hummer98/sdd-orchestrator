/**
 * DependencyResolver
 * コマンドセット間の依存関係を解決し、インストール順序を決定する
 * Requirements: 3.5
 */

import { CommandsetName } from './unifiedCommandsetInstaller';
import { Result } from './ccSddWorkflowInstaller';

/**
 * Dependency error types
 */
export type DependencyError =
  | { type: 'CIRCULAR_DEPENDENCY'; cycle: readonly CommandsetName[] }
  | { type: 'MISSING_DEPENDENCY'; commandset: CommandsetName; required: CommandsetName };

/**
 * Circular dependency information
 */
export interface CircularDependency {
  readonly cycle: readonly CommandsetName[];
}

/**
 * Commandset definition for dependency resolution
 * In current design, commandsets have no dependencies between them
 * This is a future-proof structure for when dependencies are needed
 */
interface CommandsetDependencyInfo {
  readonly name: CommandsetName;
  readonly dependencies: readonly CommandsetName[];
}

/**
 * Dependency Resolver
 * コマンドセット間の依存関係を解決し、インストール順序を決定
 */
export class DependencyResolver {
  /**
   * Commandset dependency definitions
   * Currently no dependencies exist between commandsets
   * Future: Add dependencies as needed (e.g., bug might depend on spec-manager)
   */
  private readonly commandsetDependencies: ReadonlyMap<CommandsetName, CommandsetDependencyInfo> = new Map([
    ['cc-sdd', { name: 'cc-sdd', dependencies: [] }],
    ['bug', { name: 'bug', dependencies: [] }],
    ['spec-manager', { name: 'spec-manager', dependencies: [] }], // Alias for cc-sdd
  ]);

  /**
   * Resolve install order based on dependencies (topological sort)
   * @param commandsets - Commandsets to install
   * Requirements: 3.5
   */
  resolveInstallOrder(
    commandsets: readonly CommandsetName[]
  ): Result<CommandsetName[], DependencyError> {
    // Deduplicate commandsets
    const uniqueCommandsets = [...new Set(commandsets)];

    // If empty, return empty
    if (uniqueCommandsets.length === 0) {
      return { ok: true, value: [] };
    }

    // Check for missing dependencies
    for (const commandset of uniqueCommandsets) {
      const info = this.commandsetDependencies.get(commandset);
      if (!info) {
        // Unknown commandset is treated as having no dependencies
        continue;
      }

      for (const dep of info.dependencies) {
        if (!uniqueCommandsets.includes(dep)) {
          return {
            ok: false,
            error: {
              type: 'MISSING_DEPENDENCY',
              commandset,
              required: dep,
            },
          };
        }
      }
    }

    // Detect circular dependencies
    const circular = this.detectCircularDependencies(uniqueCommandsets);
    if (circular.length > 0) {
      return {
        ok: false,
        error: {
          type: 'CIRCULAR_DEPENDENCY',
          cycle: circular[0].cycle,
        },
      };
    }

    // Perform topological sort
    const sorted = this.topologicalSort(uniqueCommandsets);
    return { ok: true, value: sorted };
  }

  /**
   * Detect circular dependencies
   * @param commandsets - Commandsets to check
   * Requirements: 3.5
   */
  detectCircularDependencies(
    commandsets: readonly CommandsetName[]
  ): CircularDependency[] {
    const circular: CircularDependency[] = [];
    const visited = new Set<CommandsetName>();
    const recursionStack = new Set<CommandsetName>();

    const dfs = (commandset: CommandsetName, path: CommandsetName[]): boolean => {
      visited.add(commandset);
      recursionStack.add(commandset);
      path.push(commandset);

      const info = this.commandsetDependencies.get(commandset);
      if (info) {
        for (const dep of info.dependencies) {
          if (!commandsets.includes(dep)) {
            continue; // Skip dependencies not in the install list
          }

          if (!visited.has(dep)) {
            if (dfs(dep, path)) {
              return true;
            }
          } else if (recursionStack.has(dep)) {
            // Circular dependency detected
            const cycleStart = path.indexOf(dep);
            const cycle = path.slice(cycleStart);
            circular.push({ cycle });
            return true;
          }
        }
      }

      recursionStack.delete(commandset);
      path.pop();
      return false;
    };

    for (const commandset of commandsets) {
      if (!visited.has(commandset)) {
        dfs(commandset, []);
      }
    }

    return circular;
  }

  /**
   * Topological sort using Kahn's algorithm
   * @param commandsets - Commandsets to sort
   */
  private topologicalSort(commandsets: readonly CommandsetName[]): CommandsetName[] {
    const inDegree = new Map<CommandsetName, number>();
    const adjacencyList = new Map<CommandsetName, CommandsetName[]>();

    // Initialize in-degree and adjacency list
    for (const commandset of commandsets) {
      inDegree.set(commandset, 0);
      adjacencyList.set(commandset, []);
    }

    // Build graph
    for (const commandset of commandsets) {
      const info = this.commandsetDependencies.get(commandset);
      if (info) {
        for (const dep of info.dependencies) {
          if (commandsets.includes(dep)) {
            // dep -> commandset edge (dep must be installed before commandset)
            const neighbors = adjacencyList.get(dep) || [];
            neighbors.push(commandset);
            adjacencyList.set(dep, neighbors);
            inDegree.set(commandset, (inDegree.get(commandset) || 0) + 1);
          }
        }
      }
    }

    // Find all nodes with in-degree 0
    const queue: CommandsetName[] = [];
    for (const [commandset, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(commandset);
      }
    }

    const result: CommandsetName[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      const neighbors = adjacencyList.get(current) || [];
      for (const neighbor of neighbors) {
        const degree = inDegree.get(neighbor)! - 1;
        inDegree.set(neighbor, degree);
        if (degree === 0) {
          queue.push(neighbor);
        }
      }
    }

    // If result doesn't contain all commandsets, there's a cycle
    // (This should have been caught by detectCircularDependencies)
    if (result.length !== commandsets.length) {
      // Return original order as fallback
      return [...commandsets];
    }

    return result;
  }
}
