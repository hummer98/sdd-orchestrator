/**
 * BugWorkflowInstaller
 * Bug Workflowのコマンド、テンプレート、CLAUDE.mdセクションをプロジェクトにインストール
 */

import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { join, dirname } from 'path';

/**
 * Bug Workflow コマンド一覧
 */
export const BUG_COMMANDS = [
  'bug-create',
  'bug-analyze',
  'bug-fix',
  'bug-verify',
  'bug-status',
] as const;

/**
 * Bug Workflow テンプレート一覧
 */
export const BUG_TEMPLATES = [
  'report.md',
  'analysis.md',
  'fix.md',
  'verification.md',
] as const;

/**
 * CLAUDE.mdに追加するBug Workflowセクション
 */
export const BUG_WORKFLOW_CLAUDE_MD_SECTION = `### Bug Fix (Lightweight Workflow)

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
export interface BugWorkflowInstallResult {
  readonly commands: InstallResult;
  readonly templates: InstallResult;
  readonly claudeMd: ClaudeMdUpdateResult;
}

/**
 * Install status
 */
export interface BugWorkflowInstallStatus {
  readonly commands: {
    readonly installed: readonly string[];
    readonly missing: readonly string[];
  };
  readonly templates: {
    readonly installed: readonly string[];
    readonly missing: readonly string[];
  };
  readonly claudeMd: {
    readonly exists: boolean;
    readonly hasBugSection: boolean;
  };
}

/**
 * Install error types
 */
export type InstallError =
  | { type: 'TEMPLATE_NOT_FOUND'; path: string }
  | { type: 'WRITE_ERROR'; path: string; message: string }
  | { type: 'PERMISSION_DENIED'; path: string };

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
 * Bug Workflow Installer Service
 */
export class BugWorkflowInstaller {
  private templateDir: string;

  /**
   * Create installer with template directory
   * @param templateDir - Directory containing template files
   */
  constructor(templateDir: string) {
    this.templateDir = templateDir;
  }

  /**
   * Install bug commands to project
   * @param projectPath - Project root path
   * @param options - Install options
   */
  async installCommands(
    projectPath: string,
    options: InstallOptions = {}
  ): Promise<Result<InstallResult, InstallError>> {
    const installed: string[] = [];
    const skipped: string[] = [];
    const overwritten: string[] = [];
    const { force = false } = options;

    for (const cmd of BUG_COMMANDS) {
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
   * Install bug templates to project
   * @param projectPath - Project root path
   * @param options - Install options
   */
  async installTemplates(
    projectPath: string,
    options: InstallOptions = {}
  ): Promise<Result<InstallResult, InstallError>> {
    const installed: string[] = [];
    const skipped: string[] = [];
    const overwritten: string[] = [];
    const { force = false } = options;

    for (const tmpl of BUG_TEMPLATES) {
      const templatePath = join(this.templateDir, 'settings', 'templates', 'bugs', tmpl);
      const targetPath = join(projectPath, '.kiro', 'settings', 'templates', 'bugs', tmpl);

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
        skipped.push(tmpl);
        continue;
      }

      // Install the file
      try {
        const content = await readFile(templatePath, 'utf-8');
        await mkdir(dirname(targetPath), { recursive: true });
        await writeFile(targetPath, content, 'utf-8');
        if (exists) {
          overwritten.push(tmpl);
        } else {
          installed.push(tmpl);
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
   * Update CLAUDE.md with bug workflow section
   * @param projectPath - Project root path
   */
  async updateClaudeMd(
    projectPath: string
  ): Promise<Result<ClaudeMdUpdateResult, InstallError>> {
    const targetPath = join(projectPath, 'CLAUDE.md');
    const exists = await fileExists(targetPath);

    try {
      if (!exists) {
        // Create new CLAUDE.md with bug section
        const content = `# Project\n\n## Minimal Workflow\n\n${BUG_WORKFLOW_CLAUDE_MD_SECTION}\n`;
        await writeFile(targetPath, content, 'utf-8');
        return { ok: true, value: { action: 'created' } };
      }

      // Read existing content
      const existingContent = await readFile(targetPath, 'utf-8');

      // Check if bug section already exists
      if (this.hasBugWorkflowSection(existingContent)) {
        return { ok: true, value: { action: 'skipped', reason: 'already_exists' } };
      }

      // Merge bug section into existing content
      const mergedContent = this.mergeBugSection(existingContent);
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
   * Check if content has bug workflow section
   */
  private hasBugWorkflowSection(content: string): boolean {
    return content.includes('Bug Fix (Lightweight Workflow)') ||
           content.includes('Bug Fix Workflow') ||
           (content.includes('/kiro:bug-create') && content.includes('/kiro:bug-analyze'));
  }

  /**
   * Merge bug section into existing content
   * Strategy: Insert after "Feature Development" section or at end of "Minimal Workflow" section
   */
  private mergeBugSection(content: string): string {
    const lines = content.split('\n');
    const result: string[] = [];
    let inserted = false;
    let inFeatureDevelopment = false;
    let featureDevEndIndex = -1;

    // Find where to insert: after Feature Development section ends
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Track Feature Development section
      if (line.includes('Feature Development')) {
        inFeatureDevelopment = true;
      }

      // Detect end of Feature Development section (next heading at same or higher level)
      if (inFeatureDevelopment && i > 0) {
        if (line.match(/^##[^#]/) || line.match(/^#[^#]/)) {
          featureDevEndIndex = i;
          inFeatureDevelopment = false;
        }
      }
    }

    // Insert bug section
    for (let i = 0; i < lines.length; i++) {
      // Insert before the next section after Feature Development
      if (i === featureDevEndIndex && !inserted) {
        result.push('');
        result.push(BUG_WORKFLOW_CLAUDE_MD_SECTION);
        result.push('');
        inserted = true;
      }

      result.push(lines[i]);
    }

    // If not inserted (no Feature Development section found), append at end
    if (!inserted) {
      // Try to find Minimal Workflow section
      const minimalWorkflowIndex = lines.findIndex(l => l.includes('Minimal Workflow'));
      if (minimalWorkflowIndex >= 0) {
        // Find next major section after Minimal Workflow
        let insertIndex = lines.length;
        for (let i = minimalWorkflowIndex + 1; i < lines.length; i++) {
          if (lines[i].match(/^##[^#]/) && !lines[i].includes('Workflow')) {
            insertIndex = i;
            break;
          }
        }
        result.splice(insertIndex, 0, '', BUG_WORKFLOW_CLAUDE_MD_SECTION, '');
      } else {
        // No suitable location found, append at end
        result.push('');
        result.push(BUG_WORKFLOW_CLAUDE_MD_SECTION);
      }
    }

    return result.join('\n');
  }

  /**
   * Install all bug workflow components
   * @param projectPath - Project root path
   * @param options - Install options
   */
  async installAll(
    projectPath: string,
    options: InstallOptions = {}
  ): Promise<Result<BugWorkflowInstallResult, InstallError>> {
    // Install commands
    const commandsResult = await this.installCommands(projectPath, options);
    if (!commandsResult.ok) {
      return commandsResult;
    }

    // Install templates
    const templatesResult = await this.installTemplates(projectPath, options);
    if (!templatesResult.ok) {
      return templatesResult;
    }

    // Update CLAUDE.md
    const claudeMdResult = await this.updateClaudeMd(projectPath);
    if (!claudeMdResult.ok) {
      return claudeMdResult;
    }

    return {
      ok: true,
      value: {
        commands: commandsResult.value,
        templates: templatesResult.value,
        claudeMd: claudeMdResult.value,
      },
    };
  }

  /**
   * Check installation status
   * @param projectPath - Project root path
   */
  async checkInstallStatus(projectPath: string): Promise<BugWorkflowInstallStatus> {
    const installedCommands: string[] = [];
    const missingCommands: string[] = [];

    for (const cmd of BUG_COMMANDS) {
      const targetPath = join(projectPath, '.claude', 'commands', 'kiro', `${cmd}.md`);
      if (await fileExists(targetPath)) {
        installedCommands.push(cmd);
      } else {
        missingCommands.push(cmd);
      }
    }

    const installedTemplates: string[] = [];
    const missingTemplates: string[] = [];

    for (const tmpl of BUG_TEMPLATES) {
      const targetPath = join(projectPath, '.kiro', 'settings', 'templates', 'bugs', tmpl);
      if (await fileExists(targetPath)) {
        installedTemplates.push(tmpl);
      } else {
        missingTemplates.push(tmpl);
      }
    }

    const claudeMdPath = join(projectPath, 'CLAUDE.md');
    const claudeMdExists = await fileExists(claudeMdPath);
    let hasBugSection = false;

    if (claudeMdExists) {
      const content = await readFile(claudeMdPath, 'utf-8');
      hasBugSection = this.hasBugWorkflowSection(content);
    }

    return {
      commands: {
        installed: installedCommands,
        missing: missingCommands,
      },
      templates: {
        installed: installedTemplates,
        missing: missingTemplates,
      },
      claudeMd: {
        exists: claudeMdExists,
        hasBugSection,
      },
    };
  }
}
