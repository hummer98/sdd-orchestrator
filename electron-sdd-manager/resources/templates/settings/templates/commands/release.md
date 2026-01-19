---
description: Project release workflow - semantic versioning and release automation
allowed-tools: Bash, Read, Write, Glob, Grep
---

# Release Workflow

## Prerequisites

Before starting the release process:

1. Ensure working directory is clean:
   ```bash
   git status
   ```

2. Confirm you are on the main branch:
   ```bash
   git branch --show-current
   ```

3. All tests pass:
   ```bash
   {{TEST_COMMAND}}
   ```

4. Build succeeds:
   ```bash
   {{BUILD_COMMAND}}
   ```

## Version Decision

Determine the next version using semantic versioning:

- **major**: Breaking changes (API incompatibility)
- **minor**: New features (backward compatible)
- **patch**: Bug fixes

Current version: Check `{{VERSION_SOURCE}}`

## CHANGELOG Update

Update `CHANGELOG.md` with release notes:

1. Add new version section at top
2. Document changes since last release
3. Categorize: Added, Changed, Fixed, Removed

## Build & Package

Build the project for release:

```bash
{{BUILD_COMMAND}}
```

{{#PACKAGE_COMMANDS}}
Package for distribution:
```bash
{{PACKAGE_COMMAND}}
```
{{/PACKAGE_COMMANDS}}

## Commit & Tag

Commit release changes and create tag:

```bash
git add -A
git commit -m "chore: release v{{VERSION}}"
git tag v{{VERSION}}
git push origin {{MAIN_BRANCH}} --tags
```

## Publish

{{#NPM_PUBLISH}}
For npm packages:
```bash
npm publish
```
{{/NPM_PUBLISH}}

{{#GITHUB_RELEASE}}
For GitHub Release:
```bash
gh release create v{{VERSION}} --generate-notes
```
{{/GITHUB_RELEASE}}

{{#ELECTRON_PUBLISH}}
For Electron app:
```bash
{{ELECTRON_PUBLISH_COMMAND}}
```
{{/ELECTRON_PUBLISH}}

## Post-Release

1. Verify release is available
2. Update documentation if needed
3. Announce release (if applicable)

## Notes

- Customize commands based on your project setup
- For Electron apps, additional signing steps may be required
- CI/CD pipelines may automate some of these steps
