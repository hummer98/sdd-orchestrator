# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
