---
description: Analyze a GitHub Issue and investigate root cause
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
argument-hint: <issue-number>
---

# Issue Analysis

<background_information>
- **Mission**: Read a GitHub Issue, investigate the root cause, and document findings
- **Success Criteria**:
  - Issue context is loaded and understood
  - Root cause is identified with file/line references
  - Analysis summary is posted as an Issue comment
  - Issue Label is updated to `status:in-progress`
- **Workflow Position**: Triage -> **Analyze** -> Fix -> Verify
</background_information>

<environment_context>
**Current Working Directory**: The directory where this command is executed
**CRITICAL**: All file operations MUST be performed relative to the current working directory.

- Source files: All paths are relative to current directory
- Script location: `.kiro/scripts/gh-issue.sh`
</environment_context>

<instructions>
## Core Task
Analyze the GitHub Issue specified by `$0` (issue number), investigate root cause, and report findings.

## Parse Arguments
- Issue number: `$0` (required)

## Execution Steps

### 1. Load Issue Context
Fetch the Issue body and all comments using `gh-issue.sh`:

```bash
bash .kiro/scripts/gh-issue.sh read $0
```

Read the output carefully. This is your primary context for the investigation.

### 2. Investigate Root Cause
Based on the Issue description:
- Search the codebase for related files using Grep/Glob
- Read relevant source files
- Identify the root cause location (file paths, line numbers)
- Assess the impact and scope of the issue

### 3. Document Analysis
Summarize your findings:
- **Root Cause**: Clear explanation with file:line references
- **Impact**: Severity and scope assessment
- **Proposed Fix**: Recommended solution approach
- **Affected Files**: List of files that need modification

### 4. Post Analysis Summary to Issue
Post the analysis results as an Issue comment:

```bash
bash .kiro/scripts/gh-issue.sh comment $0 "## Analysis Summary

**Root Cause**: <description>

**Affected Files**:
- <file1>
- <file2>

**Proposed Fix**: <approach>

---
_Analyzed by SDD Orchestrator_"
```

### 5. Update Issue Label
Set the Issue label to `status:in-progress`:

```bash
bash .kiro/scripts/gh-issue.sh label $0 set status:in-progress
```

## Analysis Guidelines
- Focus on identifying the **root cause**, not just symptoms
- Reference specific **file paths and line numbers**
- Consider **side effects** and impact on other components
- Do NOT propose quick hacks that violate design principles (DRY, SSOT, KISS)
</instructions>

## Tool Guidance
- Use **Bash** to run `gh-issue.sh` for Issue context and comment posting
- Use **Glob** to find related files by pattern
- Use **Grep** to search for relevant code patterns
- Use **Read** to examine source files

## Output Description
Provide output with the following structure:

1. **Issue Summary**: One-line description from the Issue
2. **Root Cause**: Clear explanation with file:line references
3. **Impact**: Severity and scope assessment
4. **Proposed Fix**: Recommended solution approach
5. **Next Step**: `/kiro:issue-fix $0`

## Safety & Fallback
- **Issue Not Found**: If `gh-issue.sh read` fails, verify the issue number and GitHub authentication
- **Cannot Determine Cause**: Document investigation attempts and post partial findings to Issue
- **Auth Error**: Suggest checking `GITHUB_TOKEN` or running `gh auth login`
