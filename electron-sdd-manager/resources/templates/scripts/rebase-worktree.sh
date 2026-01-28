#!/usr/bin/env bash
# rebase-worktree.sh
# Rebase worktreeブランチにmainブランチの変更を取り込む
# jj優先、gitフォールバック方式
#
# Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 10.3, 10.4
#
# Usage: rebase-worktree.sh <feature-name>
# Exit codes:
#   0 - Success (rebase完了 or Already up to date)
#   1 - Conflict (rebase中断、AI解決対象)
#   2 - Error (jq不在、spec.json/bug.json不在、引数不足)

set -euo pipefail

# Check argument
if [ -z "$1" ]; then
  echo "Error: feature-name is required" >&2
  echo "Usage: rebase-worktree.sh <feature-name>" >&2
  exit 2
fi

FEATURE_NAME="$1"

# Determine if this is a spec or bug
if [[ "$FEATURE_NAME" == bug:* ]]; then
  # Bug workflow
  BUG_NAME="${FEATURE_NAME#bug:}"
  CONFIG_JSON=".kiro/bugs/${BUG_NAME}/bug.json"
else
  # Spec workflow
  CONFIG_JSON=".kiro/specs/${FEATURE_NAME}/spec.json"
fi

# Preconditions: Check if jq is installed
if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq is not installed. Install with: brew install jq (macOS) or apt install jq (Linux)" >&2
  exit 2
fi

# Preconditions: Check if config.json exists
if [ ! -f "$CONFIG_JSON" ]; then
  echo "Error: $CONFIG_JSON not found" >&2
  exit 2
fi

# Extract worktree branch name from config.json
FEATURE_BRANCH=$(jq -r '.worktree.branch' "$CONFIG_JSON")
if [ -z "$FEATURE_BRANCH" ] || [ "$FEATURE_BRANCH" = "null" ]; then
  echo "Error: worktree.branch not found in $CONFIG_JSON" >&2
  exit 2
fi

# Check if this is a git repository
if [ ! -d ".git" ]; then
  echo "Error: Not a git repository" >&2
  exit 2
fi

# Extract main branch name (assume 'master' as default)
MAIN_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo "master")

# Check if main branch exists
if ! git show-ref --verify --quiet "refs/heads/$MAIN_BRANCH"; then
  echo "Error: main branch not found" >&2
  exit 2
fi

echo "Rebasing branch $FEATURE_BRANCH from $MAIN_BRANCH..." >&2

# Checkout the feature branch
git checkout "$FEATURE_BRANCH" 2>/dev/null || {
  echo "Error: Failed to checkout $FEATURE_BRANCH branch" >&2
  exit 2
}

# Check if jj is available
if command -v jj >/dev/null 2>&1; then
  echo "Using jj for rebase..." >&2
  echo "[rebase-worktree.sh] Executing: jj rebase -d $MAIN_BRANCH" >&2

  # Use jj rebase to rebase onto main
  if jj rebase -d "$MAIN_BRANCH" 2>&1; then
    echo "[rebase-worktree.sh] jj rebase exit code: 0 (success)" >&2
    # Check if already up to date
    if jj log --limit 1 2>&1 | grep -q "up to date\|no new commits"; then
      echo "[rebase-worktree.sh] Result: Already up to date" >&2
      echo "Already up to date"
      exit 0
    fi
    echo "[rebase-worktree.sh] Result: Rebase completed successfully" >&2
    echo "Rebase completed successfully"
    exit 0
  else
    EXIT_CODE=$?
    echo "[rebase-worktree.sh] jj rebase exit code: $EXIT_CODE" >&2
    # Check if it's a conflict or other error
    if jj log --limit 1 2>&1 | grep -q "conflict"; then
      echo "[rebase-worktree.sh] Result: Conflict detected (exit 1)" >&2
      echo "Conflict detected during rebase" >&2
      exit 1
    else
      echo "[rebase-worktree.sh] Result: Error occurred (exit 2)" >&2
      echo "jj rebase failed with exit code $EXIT_CODE" >&2
      exit 2
    fi
  fi
else
  echo "jj not found, falling back to git rebase..." >&2
  echo "[rebase-worktree.sh] Executing: git rebase $MAIN_BRANCH" >&2

  # Fetch latest changes from main
  git fetch origin "$MAIN_BRANCH" 2>&1 || {
    echo "Warning: Failed to fetch $MAIN_BRANCH, using local branch" >&2
  }

  # Check if already up to date before rebasing
  MERGE_BASE=$(git merge-base "$FEATURE_BRANCH" "$MAIN_BRANCH")
  MAIN_HEAD=$(git rev-parse "$MAIN_BRANCH")

  if [ "$MERGE_BASE" = "$MAIN_HEAD" ]; then
    echo "[rebase-worktree.sh] Result: Already up to date" >&2
    echo "Already up to date"
    exit 0
  fi

  # Use git rebase as fallback
  if git rebase "$MAIN_BRANCH" 2>&1; then
    echo "[rebase-worktree.sh] git rebase exit code: 0 (success)" >&2
    echo "[rebase-worktree.sh] Result: Rebase completed successfully" >&2
    echo "Rebase completed successfully"
    exit 0
  else
    EXIT_CODE=$?
    echo "[rebase-worktree.sh] git rebase exit code: $EXIT_CODE" >&2
    # Check if it's a conflict
    if git status | grep -q "rebase in progress\|You have unmerged paths"; then
      echo "[rebase-worktree.sh] Result: Conflict detected (exit 1)" >&2
      echo "Conflict detected during rebase" >&2
      exit 1
    else
      echo "[rebase-worktree.sh] Result: Error occurred (exit 2)" >&2
      echo "git rebase failed with exit code $EXIT_CODE" >&2
      exit 2
    fi
  fi
fi
