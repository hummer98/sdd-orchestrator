/**
 * ValidationService
 * インストール後のファイル存在と構造の検証を実行
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6
 */

import { readFile, access } from 'fs/promises';
import { join } from 'path';
import { CommandsetName } from './unifiedCommandsetInstaller';
import { Result } from './ccSddWorkflowInstaller';
import { CC_SDD_COMMANDS, CC_SDD_AGENTS, CC_SDD_SETTINGS } from './ccSddWorkflowInstaller';
import { BUG_COMMANDS, BUG_TEMPLATES } from './bugWorkflowInstaller';

/**
 * File types for validation
 * Requirements: 11.4
 */
export type FileType = 'command' | 'agent' | 'template' | 'setting';

/**
 * Validation error types
 * Requirements: 11.5
 */
export interface ValidationError {
  readonly type: 'FILE_NOT_FOUND' | 'INVALID_FORMAT' | 'MISSING_SECTION';
  readonly filePath: string;
  readonly message: string;
}

/**
 * Validation warning types
 */
export interface ValidationWarning {
  readonly type: 'OPTIONAL_SECTION_MISSING' | 'DEPRECATED_FORMAT';
  readonly filePath: string;
  readonly message: string;
}

/**
 * Validation report
 * Requirements: 11.5
 */
export interface ValidationReport {
  readonly isValid: boolean;
  readonly errors: readonly ValidationError[];
  readonly warnings: readonly ValidationWarning[];
  readonly summary: {
    readonly totalFiles: number;
    readonly validFiles: number;
    readonly invalidFiles: number;
  };
}

/**
 * Required sections for different file types
 */
const REQUIRED_SECTIONS: Record<FileType, string[]> = {
  command: ['## Role', '## Task'],
  agent: ['## Role'],
  template: [],
  setting: [],
};

/**
 * Dangerous command patterns to detect in template files
 * Requirements: 11.4
 */
const DANGEROUS_PATTERNS = [
  /rm\s+-rf\s+\//,           // rm -rf /
  /rm\s+-rf\s+--no-preserve-root/,
  /eval\s+['"$`]/,            // eval with command substitution
  />\s*\/dev\/sd[a-z]/,       // Writing to raw disk devices
  /mkfs\./,                   // Formatting filesystems
  /dd\s+if=.*of=\/dev/,       // dd to devices
  /chmod\s+-R\s+777\s+\//,    // chmod 777 on root
  /:(){ :|:& };:/,            // Fork bomb
];

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
 * Get required files for each commandset
 */
function getRequiredFiles(commandsets: readonly CommandsetName[]): {
  commands: string[];
  agents: string[];
  settings: string[];
  templates: string[];
} {
  const commands: string[] = [];
  const agents: string[] = [];
  const settings: string[] = [];
  const templates: string[] = [];

  for (const commandset of commandsets) {
    switch (commandset) {
      case 'cc-sdd':
        commands.push(...CC_SDD_COMMANDS);
        agents.push(...CC_SDD_AGENTS);
        // Split settings into settings and templates
        for (const setting of CC_SDD_SETTINGS) {
          if (setting.startsWith('templates/')) {
            templates.push(setting);
          } else {
            settings.push(setting);
          }
        }
        break;
      case 'bug':
        commands.push(...BUG_COMMANDS);
        templates.push(...BUG_TEMPLATES.map(t => `templates/bugs/${t}`));
        break;
      case 'spec-manager':
        // spec-manager is part of cc-sdd
        break;
    }
  }

  return {
    commands: [...new Set(commands)],
    agents: [...new Set(agents)],
    settings: [...new Set(settings)],
    templates: [...new Set(templates)],
  };
}

/**
 * ValidationService
 * インストール後の検証とヘルスチェックを提供
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6
 */
export class ValidationService {
  /**
   * Validate installation
   * Requirements: 11.1, 11.2, 11.3, 11.5
   * @param projectPath - Project root path
   * @param commandsets - Installed commandsets
   */
  async validateInstallation(
    projectPath: string,
    commandsets: readonly CommandsetName[]
  ): Promise<ValidationReport> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let totalFiles = 0;
    let validFiles = 0;

    const requiredFiles = getRequiredFiles(commandsets);

    // Validate commands
    for (const cmd of requiredFiles.commands) {
      totalFiles++;
      const filePath = join(projectPath, '.claude', 'commands', 'kiro', `${cmd}.md`);

      const result = await this.validateFileStructure(filePath, 'command');
      if (result.ok) {
        validFiles++;
      } else {
        errors.push(result.error);
      }
    }

    // Validate agents
    for (const agent of requiredFiles.agents) {
      totalFiles++;
      const filePath = join(projectPath, '.claude', 'agents', 'kiro', `${agent}.md`);

      const result = await this.validateFileStructure(filePath, 'agent');
      if (result.ok) {
        validFiles++;
      } else {
        errors.push(result.error);
      }
    }

    // Validate settings
    for (const setting of requiredFiles.settings) {
      totalFiles++;
      const filePath = join(projectPath, '.kiro', 'settings', setting);

      const result = await this.validateFileStructure(filePath, 'setting');
      if (result.ok) {
        validFiles++;
      } else {
        errors.push(result.error);
      }
    }

    // Validate templates
    for (const template of requiredFiles.templates) {
      totalFiles++;
      const filePath = join(projectPath, '.kiro', 'settings', template);

      const result = await this.validateFileStructure(filePath, 'template');
      if (result.ok) {
        validFiles++;
      } else {
        errors.push(result.error);
      }
    }

    // Validate CLAUDE.md
    totalFiles++;
    const claudeMdResult = await this.validateClaudeMd(projectPath);
    if (claudeMdResult.ok) {
      validFiles++;
    } else {
      errors.push(claudeMdResult.error);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary: {
        totalFiles,
        validFiles,
        invalidFiles: totalFiles - validFiles,
      },
    };
  }

  /**
   * Validate file structure
   * Requirements: 11.4
   * @param filePath - File path to validate
   * @param fileType - Type of file
   */
  async validateFileStructure(
    filePath: string,
    fileType: FileType
  ): Promise<Result<void, ValidationError>> {
    // Check if file exists
    if (!(await fileExists(filePath))) {
      return {
        ok: false,
        error: {
          type: 'FILE_NOT_FOUND',
          filePath,
          message: `File not found: ${filePath}`,
        },
      };
    }

    try {
      const content = await readFile(filePath, 'utf-8');

      // Check required sections for the file type
      const requiredSections = REQUIRED_SECTIONS[fileType];
      for (const section of requiredSections) {
        if (!content.includes(section)) {
          return {
            ok: false,
            error: {
              type: 'MISSING_SECTION',
              filePath,
              message: `Missing required section "${section}" in ${filePath}`,
            },
          };
        }
      }

      // For template files, check for dangerous patterns
      if (fileType === 'template') {
        for (const pattern of DANGEROUS_PATTERNS) {
          if (pattern.test(content)) {
            return {
              ok: false,
              error: {
                type: 'INVALID_FORMAT',
                filePath,
                message: `File contains dangerous command pattern: ${filePath}`,
              },
            };
          }
        }
      }

      return { ok: true, value: undefined };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        error: {
          type: 'INVALID_FORMAT',
          filePath,
          message: `Error reading file: ${message}`,
        },
      };
    }
  }

  /**
   * Validate CLAUDE.md
   * Requirements: 11.6
   * @param projectPath - Project root path
   */
  async validateClaudeMd(
    projectPath: string
  ): Promise<Result<void, ValidationError>> {
    const filePath = join(projectPath, 'CLAUDE.md');

    // Check if file exists
    if (!(await fileExists(filePath))) {
      return {
        ok: false,
        error: {
          type: 'FILE_NOT_FOUND',
          filePath,
          message: 'CLAUDE.md not found',
        },
      };
    }

    try {
      const content = await readFile(filePath, 'utf-8');

      // Check for required sections
      const requiredPatterns = [
        'Feature Development',
        '/kiro:spec-',
      ];

      for (const pattern of requiredPatterns) {
        if (!content.includes(pattern)) {
          return {
            ok: false,
            error: {
              type: 'MISSING_SECTION',
              filePath,
              message: `CLAUDE.md is missing required section containing "${pattern}"`,
            },
          };
        }
      }

      return { ok: true, value: undefined };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        error: {
          type: 'INVALID_FORMAT',
          filePath,
          message: `Error reading CLAUDE.md: ${message}`,
        },
      };
    }
  }
}
