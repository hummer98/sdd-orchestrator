---
description: Create a well-structured git commit
allowed-tools: Bash
---

# Git Commit Helper

## Mission

Create a well-structured git commit with a clear, descriptive message following conventional commit guidelines.

## Workflow

### Phase 1: Analyze Changes

1. Run `git status` to see staged and unstaged changes
2. Run `git diff --staged` to see what will be committed
3. If nothing is staged, suggest which files to stage

### Phase 2: Generate Commit Message

Follow this format:
```
<type>(<scope>): <short description>

<body - optional, explain what and why>

<footer - optional, breaking changes, issue references>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Phase 3: Create Commit

Execute the commit with the generated message.

## Output

After analyzing changes, propose a commit message and ask for confirmation before committing.

## Notes

- Always review `git diff --staged` before committing
- Keep the first line under 72 characters
- Reference issue numbers when applicable (e.g., `Fixes #123`)
- Use imperative mood ("Add feature" not "Added feature")
