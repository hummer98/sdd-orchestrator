# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.0] - 2025-12-19

### Added
- **Command prefix support**: `executeSpecInit` now supports `commandPrefix` parameter for command set switching compatibility

### Changed
- **Improved validation display**: Kiro validation results are now displayed only when issues are detected (reduces visual noise)

### Fixed
- **electron:restart task**: Fixed issue where PROJECT argument was not passed correctly during restart
- **Global agent detection**: Fixed issue where global agents (`specId=''`) were not detected and displayed correctly
- **Dark mode textarea**: Fixed issue where text was invisible in dialog textareas when dark mode is enabled

## [0.7.2] - 2025-12-19

### Changed
- **Installation profiles**: Renamed installation profile identifiers to `cc-sdd`, `cc-sdd-agent`, `spec-manager` for better clarity
- **Project selection UX**: Removed validation success display to reduce visual noise

### Fixed
- **Agent resume behavior**: Fixed issue where `allowed-tools` settings were not respected during agent resume operations

## [0.7.1] - 2025-12-18

### Changed
- **Unified Installer Phase 2**: Consolidated Tools menu by removing legacy installer menu items
  - Removed: "spec-managerコマンドを再インストール..."
  - Removed: "CLAUDE.mdをインストール..."
  - Removed: "シェルコマンドの実行許可を追加..."
  - Removed: "cc-sdd Workflowをインストール..."
  - All functionality now accessible through "コマンドセットをインストール..." unified installer

### Fixed
- **sdd CLI command**: Fixed issue where project path was not passed correctly when launching from command line

## [0.7.0] - 2025-12-18

### Added
- **Commandset Unified Installer**: New unified installer architecture for managing command sets
  - `UnifiedCommandsetInstaller`: Core installer with dependency resolution
  - `CommandsetDefinitionManager`: Command set definition management
  - `DependencyResolver`: Dependency resolution between command sets
  - `SettingsFileManager`: settings.json read/write operations
  - `ProfileManager`: Installation profile management
  - `RollbackManager`: Rollback on installation failure
  - `UpdateManager`: Command set update detection
  - `ValidationService`: Pre/post installation validation
  - `LoggingService`: Operation logging
  - `CommandsetInstallDialog`: New installation UI component
- **Command template reorganization**: Restructured command templates into new directory structure
  - `kiro/` → `bug/`, `cc-sdd-agent/`, `cc-sdd/`, `document-review/`
  - Added new `cc-sdd/` command set for simplified SDD workflow
- **Technical documentation**: Added technical note on Claude Code subagent permission inheritance issue

### Changed
- Updated README with project setup instructions, document review, and bug fix workflow documentation
- Updated existing installers to use new template paths

## [0.6.2] - 2025-12-17

### Added
- **Project name display in header**: Added project name and VSCode launch button to application header
- **Current directory support for sdd command**: The `sdd` command now opens current directory when no argument is provided

### Changed
- **Unified workflow terminology**: Integrated Bug Workflow into CC-SDD Workflow with consistent naming
- **Refactored document review panel**: Removed redundant loading indicators for cleaner UI
- **Improved auto-execution control**: Replaced `ready_for_implementation` flag with `documentReview.status`-based logic
  - Auto-execution now properly waits for document review approval before implementation phase
  - Manual execution via `/kiro:spec-impl` remains flexible (only checks tasks approval)
  - Removed redundant flag from spec.json schema

### Fixed
- Implementation phase precondition checking in auto-execution workflow

## [0.6.1] - 2025-12-15

### Added
- **Permissions check display**: Project selection screen now displays permissions check results
  - Visual feedback when permissions are missing (warning message with list)
  - Success message when all permissions are configured
  - Helps users understand what permissions need to be added

### Changed
- **Optimized logging**: Reduced log noise by only logging when issues are detected
  - Permissions check logs only when permissions are missing
  - Spec-manager file check logs only when files are missing
  - Normal operations now run silently

### Fixed
- Removed unused variable in App.tsx

## [0.6.0] - 2025-12-15

### Added
- **Automatic permissions check on project selection**: Project selection now automatically checks for required permissions in `settings.local.json`
  - New `permissionsCheck` state in `projectStore` to track permission status
  - Graceful handling when permissions check fails - project selection continues
  - Three new test cases covering permissions check scenarios
- **Release automation command**: New `/release` slash command to automate the version release process
  - Automated version bumping, changelog updates, building, and GitHub release creation

### Changed
- Enhanced project selection workflow with permissions validation
- Added `checkRequiredPermissions()` API method to ElectronAPI interface

## [0.5.0] - 2025-01-15

### Added
- **Automatic permissions addition**: CC-SDD Workflow installation now automatically adds required permissions to `.claude/settings.local.json`
  - Basic tool permissions: `Read(**), Edit(**), Write(**), Glob(**), Grep(**), WebSearch, WebFetch, Bash(**)`
  - 14 SlashCommand permissions for kiro namespace commands
- **Permission checking system**: New `checkRequiredPermissions()` and `addPermissionsToProject()` functions in `permissionsService.ts`
- **Resource path utilities**: Centralized resource path management in `resourcePaths.ts` to handle production/development environment differences
- **Automatic spec.json migration**: Old format spec.json files are automatically migrated to the new CC-SDD format
- **Settings file installation**: CC-SDD Workflow installer now installs settings files to `.kiro/settings/`

### Fixed
- **Template not found in production**: Fixed resource path resolution by using `process.resourcesPath` instead of `app.getAppPath()`
- **Missing extraResources**: Added `resources` directory to `package.json` extraResources for proper packaging
- **Requirements generation flag**: Fixed incorrect `requirements.generated` flag during spec.json migration
- **REQUIRED_COMMANDS namespace**: Updated from `spec-manager` to `kiro` namespace (14 commands)

### Changed
- Version bumped to 0.5.0
- Centralized all resource path resolution through `resourcePaths.ts` utility functions
- Updated `commandInstallerService.ts`, `permissionsService.ts`, and `cliInstallerService.ts` to use centralized path utilities

## [0.4.0] - 2025-01-14

### Added
- Initial CC-SDD Workflow installation feature
- Project checker for slash commands and settings
- CLI installer service

### Fixed
- Various bug fixes and stability improvements

## [0.3.4] - 2025-01-13

### Added
- Initial release with basic SDD Orchestrator functionality
