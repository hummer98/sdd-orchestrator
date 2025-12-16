/**
 * CcSddWorkflowInstaller
 * cc-sdd (Claude Code Spec-Driven Development) コマンドセット、エージェント、CLAUDE.mdをプロジェクトにインストール
 * Requirements: 3.1-3.8, 4.1-4.8, 6.1-6.5
 */

import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { join, dirname } from 'path';
import { spawn } from 'child_process';
import { addPermissionsToProject } from './permissionsService';
import { REQUIRED_PERMISSIONS } from './projectChecker';

/**
 * cc-sdd コマンド一覧（19種類）
 * Requirements: 2.1-2.5
 */
export const CC_SDD_COMMANDS = [
  // Spec Workflow (7)
  'spec-init',
  'spec-requirements',
  'spec-design',
  'spec-tasks',
  'spec-impl',
  'spec-status',
  'spec-quick',
  // Validation (3)
  'validate-gap',
  'validate-design',
  'validate-impl',
  // Document Review (2)
  'document-review',
  'document-review-reply',
  // Steering (2)
  'steering',
  'steering-custom',
  // Bug Workflow (5)
  'bug-create',
  'bug-analyze',
  'bug-fix',
  'bug-verify',
  'bug-status',
] as const;

/**
 * cc-sdd エージェント一覧（9種類）
 * Claude Code subagent として使用されるエージェント定義ファイル
 */
export const CC_SDD_AGENTS = [
  // Spec Agents (4)
  'spec-design',
  'spec-impl',
  'spec-requirements',
  'spec-tasks',
  // Steering Agents (2)
  'steering',
  'steering-custom',
  // Validation Agents (3)
  'validate-design',
  'validate-gap',
  'validate-impl',
] as const;

/**
 * cc-sdd 設定ファイル一覧
 * Location: {projectRoot}/.kiro/settings/
 */
export const CC_SDD_SETTINGS = [
  'rules/ears-format.md',
  'rules/tasks-generation.md',
  'rules/tasks-parallel-analysis.md',
  'templates/specs/init.json',
  'templates/specs/requirements-init.md',
  'templates/specs/requirements.md',
  'templates/specs/design.md',
  'templates/specs/tasks.md',
  // Bug Workflow templates
  'templates/bugs/report.md',
  'templates/bugs/analysis.md',
  'templates/bugs/fix.md',
  'templates/bugs/verification.md',
] as const;

/**
 * CLAUDE.mdに追加するcc-sddワークフローセクション
 * Feature Development (Full SDD) と Bug Fix (Lightweight Workflow) を含む
 */
export const CC_SDD_WORKFLOW_CLAUDE_MD_SECTION = `## Minimal Workflow

### Feature Development (Full SDD)

- Phase 0 (optional): \`/kiro:steering\`, \`/kiro:steering-custom\`
- Phase 1 (Specification):
  - \`/kiro:spec-init "description"\`
  - \`/kiro:spec-requirements {feature}\`
  - \`/kiro:validate-gap {feature}\` (optional: for existing codebase)
  - \`/kiro:spec-design {feature} [-y]\`
  - \`/kiro:validate-design {feature}\` (optional: design review)
  - \`/kiro:spec-tasks {feature} [-y]\`
- Phase 2 (Implementation): \`/kiro:spec-impl {feature} [tasks]\`
  - \`/kiro:validate-impl {feature}\` (optional: after implementation)
- Progress check: \`/kiro:spec-status {feature}\` (use anytime)

### Bug Fix (Lightweight Workflow)

小規模なバグ修正にはフルSDDプロセスは不要。以下の軽量ワークフローを使用：

\`\`\`
Report → Analyze → Fix → Verify
\`\`\`

| コマンド | 説明 |
|---------|------|
| \`/kiro:bug-create <name> "description"\` | バグレポート作成 |
| \`/kiro:bug-analyze [name]\` | 根本原因の調査 |
| \`/kiro:bug-fix [name]\` | 修正の実装 |
| \`/kiro:bug-verify [name]\` | 修正の検証 |
| \`/kiro:bug-status [name]\` | 進捗確認 |

**使い分け**:
- **小規模バグ**: Bug Fixワークフロー（軽量・高速）
- **設計変更を伴う複雑なバグ**: Full SDDワークフロー`;

/**
 * Install options
 */
export interface InstallOptions {
  readonly force?: boolean;
}

/**
 * Install result
 */
export interface InstallResult {
  readonly installed: readonly string[];
  readonly skipped: readonly string[];
  readonly overwritten: readonly string[];
}

/**
 * CLAUDE.md update result
 */
export interface ClaudeMdUpdateResult {
  readonly action: 'created' | 'merged' | 'skipped';
  readonly reason?: 'already_exists';
}

/**
 * Full install result
 */
export interface CcSddWorkflowInstallResult {
  readonly commands: InstallResult;
  readonly agents: InstallResult;
  readonly settings: InstallResult;
  readonly claudeMd: ClaudeMdUpdateResult;
}

/**
 * Install status
 */
export interface CcSddWorkflowInstallStatus {
  readonly commands: {
    readonly installed: readonly string[];
    readonly missing: readonly string[];
  };
  readonly agents: {
    readonly installed: readonly string[];
    readonly missing: readonly string[];
  };
  readonly settings: {
    readonly installed: readonly string[];
    readonly missing: readonly string[];
  };
  readonly claudeMd: {
    readonly exists: boolean;
    readonly hasCcSddSection: boolean;
  };
}

/**
 * Install error types
 */
export type InstallError =
  | { type: 'TEMPLATE_NOT_FOUND'; path: string }
  | { type: 'WRITE_ERROR'; path: string; message: string }
  | { type: 'PERMISSION_DENIED'; path: string }
  | { type: 'MERGE_ERROR'; message: string }
  | { type: 'TIMEOUT_ERROR'; timeoutMs: number };

/**
 * Result type
 */
export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * Check if a file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * cc-sdd Workflow Installer Service
 * Requirements: 3.1-3.8, 4.1-4.8
 */
export class CcSddWorkflowInstaller {
  private templateDir: string;

  /**
   * Create installer with template directory
   * @param templateDir - Directory containing template files
   * Requirements: 3.1
   */
  constructor(templateDir: string) {
    this.templateDir = templateDir;
  }

  /**
   * Install cc-sdd commands to project
   * @param projectPath - Project root path
   * @param options - Install options
   * Requirements: 3.2, 3.3, 3.4, 3.5, 3.6
   */
  async installCommands(
    projectPath: string,
    options: InstallOptions = {}
  ): Promise<Result<InstallResult, InstallError>> {
    const installed: string[] = [];
    const skipped: string[] = [];
    const overwritten: string[] = [];
    const { force = false } = options;

    for (const cmd of CC_SDD_COMMANDS) {
      const templatePath = join(this.templateDir, 'commands', 'kiro', `${cmd}.md`);
      const targetPath = join(projectPath, '.claude', 'commands', 'kiro', `${cmd}.md`);

      // Check if template exists
      if (!(await fileExists(templatePath))) {
        return {
          ok: false,
          error: { type: 'TEMPLATE_NOT_FOUND', path: templatePath },
        };
      }

      // Check if target already exists
      const exists = await fileExists(targetPath);
      if (exists && !force) {
        skipped.push(cmd);
        continue;
      }

      // Install the file
      try {
        const content = await readFile(templatePath, 'utf-8');
        await mkdir(dirname(targetPath), { recursive: true });
        await writeFile(targetPath, content, 'utf-8');
        if (exists) {
          overwritten.push(cmd);
        } else {
          installed.push(cmd);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('EACCES') || message.includes('EPERM')) {
          return {
            ok: false,
            error: { type: 'PERMISSION_DENIED', path: targetPath },
          };
        }
        return {
          ok: false,
          error: { type: 'WRITE_ERROR', path: targetPath, message },
        };
      }
    }

    return { ok: true, value: { installed, skipped, overwritten } };
  }

  /**
   * Install cc-sdd agents to project
   * @param projectPath - Project root path
   * @param options - Install options
   * Requirements: 3.2, 3.3, 3.4, 3.5, 3.6
   */
  async installAgents(
    projectPath: string,
    options: InstallOptions = {}
  ): Promise<Result<InstallResult, InstallError>> {
    const installed: string[] = [];
    const skipped: string[] = [];
    const overwritten: string[] = [];
    const { force = false } = options;

    for (const agent of CC_SDD_AGENTS) {
      const templatePath = join(this.templateDir, 'agents', 'kiro', `${agent}.md`);
      const targetPath = join(projectPath, '.claude', 'agents', 'kiro', `${agent}.md`);

      // Check if template exists
      if (!(await fileExists(templatePath))) {
        return {
          ok: false,
          error: { type: 'TEMPLATE_NOT_FOUND', path: templatePath },
        };
      }

      // Check if target already exists
      const exists = await fileExists(targetPath);
      if (exists && !force) {
        skipped.push(agent);
        continue;
      }

      // Install the file
      try {
        const content = await readFile(templatePath, 'utf-8');
        await mkdir(dirname(targetPath), { recursive: true });
        await writeFile(targetPath, content, 'utf-8');
        if (exists) {
          overwritten.push(agent);
        } else {
          installed.push(agent);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('EACCES') || message.includes('EPERM')) {
          return {
            ok: false,
            error: { type: 'PERMISSION_DENIED', path: targetPath },
          };
        }
        return {
          ok: false,
          error: { type: 'WRITE_ERROR', path: targetPath, message },
        };
      }
    }

    return { ok: true, value: { installed, skipped, overwritten } };
  }

  /**
   * Install cc-sdd settings to project
   * @param projectPath - Project root path
   * @param options - Install options
   */
  async installSettings(
    projectPath: string,
    options: InstallOptions = {}
  ): Promise<Result<InstallResult, InstallError>> {
    const installed: string[] = [];
    const skipped: string[] = [];
    const overwritten: string[] = [];
    const { force = false } = options;

    for (const setting of CC_SDD_SETTINGS) {
      const templatePath = join(this.templateDir, 'settings', setting);
      const targetPath = join(projectPath, '.kiro', 'settings', setting);

      // Check if template exists
      if (!(await fileExists(templatePath))) {
        return {
          ok: false,
          error: { type: 'TEMPLATE_NOT_FOUND', path: templatePath },
        };
      }

      // Check if target already exists
      const exists = await fileExists(targetPath);
      if (exists && !force) {
        skipped.push(setting);
        continue;
      }

      // Install the file
      try {
        const content = await readFile(templatePath, 'utf-8');
        await mkdir(dirname(targetPath), { recursive: true });
        await writeFile(targetPath, content, 'utf-8');
        if (exists) {
          overwritten.push(setting);
        } else {
          installed.push(setting);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('EACCES') || message.includes('EPERM')) {
          return {
            ok: false,
            error: { type: 'PERMISSION_DENIED', path: targetPath },
          };
        }
        return {
          ok: false,
          error: { type: 'WRITE_ERROR', path: targetPath, message },
        };
      }
    }

    return { ok: true, value: { installed, skipped, overwritten } };
  }

  /**
   * Update CLAUDE.md with cc-sdd workflow section
   * Uses claude -p for semantic merge if file exists
   * @param projectPath - Project root path
   * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8
   */
  async updateClaudeMd(
    projectPath: string
  ): Promise<Result<ClaudeMdUpdateResult, InstallError>> {
    const targetPath = join(projectPath, 'CLAUDE.md');
    const templatePath = join(this.templateDir, 'CLAUDE.md');
    const exists = await fileExists(targetPath);

    try {
      if (!exists) {
        // Create new CLAUDE.md from template
        if (await fileExists(templatePath)) {
          const templateContent = await readFile(templatePath, 'utf-8');
          await writeFile(targetPath, templateContent, 'utf-8');
        } else {
          // Fallback: create with cc-sdd section only
          const content = `# AI-DLC and Spec-Driven Development\n\n${CC_SDD_WORKFLOW_CLAUDE_MD_SECTION}\n`;
          await writeFile(targetPath, content, 'utf-8');
        }
        return { ok: true, value: { action: 'created' } };
      }

      // Read existing content
      const existingContent = await readFile(targetPath, 'utf-8');

      // Check if cc-sdd section already exists
      if (this.hasCcSddWorkflowSection(existingContent)) {
        return { ok: true, value: { action: 'skipped', reason: 'already_exists' } };
      }

      // Try to merge using claude -p command
      const mergeResult = await this.mergeClaudeMdWithClaude(targetPath, existingContent);
      if (mergeResult.ok) {
        return { ok: true, value: { action: 'merged' } };
      }

      // Fallback: simple merge if claude -p fails
      const mergedContent = this.mergeCcSddSection(existingContent);
      await writeFile(targetPath, mergedContent, 'utf-8');
      return { ok: true, value: { action: 'merged' } };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('EACCES') || message.includes('EPERM')) {
        return {
          ok: false,
          error: { type: 'PERMISSION_DENIED', path: targetPath },
        };
      }
      return {
        ok: false,
        error: { type: 'WRITE_ERROR', path: targetPath, message },
      };
    }
  }

  /**
   * Check if claude CLI is available
   */
  private async isClaudeAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const child = spawn('which', ['claude'], {
        env: { ...process.env },
      });

      child.on('close', (code) => {
        resolve(code === 0);
      });

      child.on('error', () => {
        resolve(false);
      });

      // Quick timeout for which command
      setTimeout(() => {
        child.kill();
        resolve(false);
      }, 1000);
    });
  }

  /**
   * Merge CLAUDE.md using claude -p command for semantic integration
   * @param targetPath - Path to existing CLAUDE.md
   * @param existingContent - Current content of CLAUDE.md
   * Requirements: 4.2, 4.3, 4.4
   */
  private async mergeClaudeMdWithClaude(
    targetPath: string,
    existingContent: string
  ): Promise<Result<string, InstallError>> {
    // Skip claude merge in test environment
    if (process.env.SKIP_CLAUDE_MERGE === 'true') {
      return {
        ok: false,
        error: { type: 'MERGE_ERROR', message: 'claude merge skipped (test environment)' },
      };
    }

    // First check if claude is available
    const claudeAvailable = await this.isClaudeAvailable();
    if (!claudeAvailable) {
      return {
        ok: false,
        error: { type: 'MERGE_ERROR', message: 'claude CLI not available' },
      };
    }

    const TIMEOUT_MS = 60000; // 60 seconds

    const prompt = `以下の既存のCLAUDE.mdに、cc-sddワークフローセクションをセマンティックに統合してください。
既存のカスタマイズ内容は保持し、新しいセクションを適切な位置に追加してください。
出力は統合後のCLAUDE.md全体の内容のみを出力してください。説明やコメントは不要です。

【追加するセクション】
${CC_SDD_WORKFLOW_CLAUDE_MD_SECTION}

【既存のCLAUDE.md】
${existingContent}`;

    return new Promise((resolve) => {
      const child = spawn('claude', ['--print', prompt], {
        env: { ...process.env },
        timeout: TIMEOUT_MS,
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const timeoutId = setTimeout(() => {
        timedOut = true;
        child.kill();
        resolve({
          ok: false,
          error: { type: 'TIMEOUT_ERROR', timeoutMs: TIMEOUT_MS },
        });
      }, TIMEOUT_MS);

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('error', (error) => {
        clearTimeout(timeoutId);
        if (!timedOut) {
          resolve({
            ok: false,
            error: { type: 'MERGE_ERROR', message: error.message },
          });
        }
      });

      child.on('close', async (code) => {
        clearTimeout(timeoutId);
        if (timedOut) return;

        if (code === 0 && stdout.trim()) {
          try {
            await writeFile(targetPath, stdout.trim(), 'utf-8');
            resolve({ ok: true, value: stdout.trim() });
          } catch (writeError) {
            resolve({
              ok: false,
              error: {
                type: 'WRITE_ERROR',
                path: targetPath,
                message: writeError instanceof Error ? writeError.message : String(writeError),
              },
            });
          }
        } else {
          resolve({
            ok: false,
            error: { type: 'MERGE_ERROR', message: stderr || 'claude command failed' },
          });
        }
      });
    });
  }

  /**
   * Check if content has cc-sdd workflow section
   */
  private hasCcSddWorkflowSection(content: string): boolean {
    return (
      content.includes('Feature Development (Full SDD)') ||
      (content.includes('/kiro:spec-init') && content.includes('/kiro:spec-requirements'))
    );
  }

  /**
   * Merge cc-sdd section into existing content
   * Strategy: Insert after existing workflow section or append at end
   */
  private mergeCcSddSection(content: string): string {
    const lines = content.split('\n');
    const result: string[] = [];
    let inserted = false;
    let inWorkflowSection = false;
    let workflowEndIndex = -1;

    // Find where to insert: after existing Workflow section ends
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Track Workflow section
      if (line.includes('Minimal Workflow') || line.includes('## Workflow')) {
        inWorkflowSection = true;
      }

      // Detect end of Workflow section (next major heading at same or higher level)
      if (inWorkflowSection && i > 0) {
        if (line.match(/^##[^#]/) && !line.includes('Workflow')) {
          workflowEndIndex = i;
          inWorkflowSection = false;
        }
      }
    }

    // Insert cc-sdd section
    for (let i = 0; i < lines.length; i++) {
      // Insert before the next section after Workflow
      if (i === workflowEndIndex && !inserted) {
        result.push('');
        result.push(CC_SDD_WORKFLOW_CLAUDE_MD_SECTION);
        result.push('');
        inserted = true;
      }

      result.push(lines[i]);
    }

    // If not inserted (no Workflow section found), append at end
    if (!inserted) {
      result.push('');
      result.push(CC_SDD_WORKFLOW_CLAUDE_MD_SECTION);
    }

    return result.join('\n');
  }

  /**
   * Install all cc-sdd workflow components
   * @param projectPath - Project root path
   * @param options - Install options
   * Requirements: 3.7
   */
  async installAll(
    projectPath: string,
    options: InstallOptions = {}
  ): Promise<Result<CcSddWorkflowInstallResult, InstallError>> {
    // Install commands
    const commandsResult = await this.installCommands(projectPath, options);
    if (!commandsResult.ok) {
      return commandsResult;
    }

    // Install agents
    const agentsResult = await this.installAgents(projectPath, options);
    if (!agentsResult.ok) {
      return agentsResult;
    }

    // Install settings
    const settingsResult = await this.installSettings(projectPath, options);
    if (!settingsResult.ok) {
      return settingsResult;
    }

    // Update CLAUDE.md
    const claudeMdResult = await this.updateClaudeMd(projectPath);
    if (!claudeMdResult.ok) {
      return claudeMdResult;
    }

    // Add required permissions to settings.local.json
    const permissionsResult = await addPermissionsToProject(
      projectPath,
      REQUIRED_PERMISSIONS
    );
    if (!permissionsResult.ok) {
      // Log error but don't fail installation
      console.warn('[CcSddWorkflowInstaller] Failed to add permissions:', permissionsResult.error);
    }

    return {
      ok: true,
      value: {
        commands: commandsResult.value,
        agents: agentsResult.value,
        settings: settingsResult.value,
        claudeMd: claudeMdResult.value,
      },
    };
  }

  /**
   * Check installation status
   * @param projectPath - Project root path
   * Requirements: 3.8, 6.3, 6.4, 6.5
   */
  async checkInstallStatus(projectPath: string): Promise<CcSddWorkflowInstallStatus> {
    const installedCommands: string[] = [];
    const missingCommands: string[] = [];

    for (const cmd of CC_SDD_COMMANDS) {
      const targetPath = join(projectPath, '.claude', 'commands', 'kiro', `${cmd}.md`);
      if (await fileExists(targetPath)) {
        installedCommands.push(cmd);
      } else {
        missingCommands.push(cmd);
      }
    }

    const installedAgents: string[] = [];
    const missingAgents: string[] = [];

    for (const agent of CC_SDD_AGENTS) {
      const targetPath = join(projectPath, '.claude', 'agents', 'kiro', `${agent}.md`);
      if (await fileExists(targetPath)) {
        installedAgents.push(agent);
      } else {
        missingAgents.push(agent);
      }
    }

    const installedSettings: string[] = [];
    const missingSettings: string[] = [];

    for (const setting of CC_SDD_SETTINGS) {
      const targetPath = join(projectPath, '.kiro', 'settings', setting);
      if (await fileExists(targetPath)) {
        installedSettings.push(setting);
      } else {
        missingSettings.push(setting);
      }
    }

    const claudeMdPath = join(projectPath, 'CLAUDE.md');
    const claudeMdExists = await fileExists(claudeMdPath);
    let hasCcSddSection = false;

    if (claudeMdExists) {
      const content = await readFile(claudeMdPath, 'utf-8');
      hasCcSddSection = this.hasCcSddWorkflowSection(content);
    }

    return {
      commands: {
        installed: installedCommands,
        missing: missingCommands,
      },
      agents: {
        installed: installedAgents,
        missing: missingAgents,
      },
      settings: {
        installed: installedSettings,
        missing: missingSettings,
      },
      claudeMd: {
        exists: claudeMdExists,
        hasCcSddSection,
      },
    };
  }
}
