#!/bin/bash
# merge-spec.sh
# Specマージスクリプト: worktreeブランチをmainブランチにマージ
# jj優先、gitフォールバック方式
#
# Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2, 6.3, 6.4, 6.5
#
# Usage: merge-spec.sh <feature-name>
# Exit codes:
#   0 - Success (マージ完了、worktree削除、ブランチ削除)
#   1 - Conflict (マージ中断、worktree削除せず)
#   2 - Error (jq不在、spec.json不在、引数不足)

set -e

# Check argument
if [ -z "$1" ]; then
  echo "Error: feature-name is required" >&2
  echo "Usage: merge-spec.sh <feature-name>" >&2
  exit 2
fi

FEATURE_NAME="$1"
SPEC_JSON=".kiro/specs/${FEATURE_NAME}/spec.json"

# Preconditions: Check if jq is installed
if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq is not installed. Install with: brew install jq (macOS) or apt install jq (Linux)" >&2
  exit 2
fi

# Preconditions: Check if spec.json exists
if [ ! -f "$SPEC_JSON" ]; then
  echo "Error: $SPEC_JSON not found" >&2
  exit 2
fi

# Extract worktree branch name from spec.json
FEATURE_BRANCH=$(jq -r '.worktree.branch' "$SPEC_JSON")
if [ -z "$FEATURE_BRANCH" ] || [ "$FEATURE_BRANCH" = "null" ]; then
  echo "Error: worktree.branch not found in $SPEC_JSON" >&2
  exit 2
fi

# Extract main branch name (assume 'master' as default)
MAIN_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo "master")

echo "Merging branch $FEATURE_BRANCH into $MAIN_BRANCH..."

# Switch to main branch
git checkout "$MAIN_BRANCH" 2>/dev/null || {
  echo "Error: Failed to checkout $MAIN_BRANCH branch" >&2
  exit 2
}

# Check if jj is available
if command -v jj >/dev/null 2>&1; then
  echo "Using jj for merge (conflict-tolerant)..."

  # Use jj squash to merge
  if jj squash --from "$FEATURE_BRANCH" --into "$MAIN_BRANCH" 2>&1; then
    echo "jj squash completed"
  else
    EXIT_CODE=$?
    # Check if it's a conflict or other error
    if jj log --limit 1 2>&1 | grep -q "conflict"; then
      echo "Conflict detected during jj squash" >&2
      exit 1
    else
      echo "jj squash failed with exit code $EXIT_CODE" >&2
      exit 2
    fi
  fi

  # Commit the squashed changes
  if [ -n "$(git status --porcelain)" ]; then
    git add -A
    git commit -m "feat(${FEATURE_NAME}): merge from worktree branch ${FEATURE_BRANCH}"
    echo "Changes committed to $MAIN_BRANCH"
  fi
else
  echo "jj not found, falling back to git merge..."

  # Use git merge --squash as fallback
  if git merge --squash "$FEATURE_BRANCH" 2>&1; then
    echo "git merge --squash completed"
  else
    EXIT_CODE=$?
    # Check if it's a conflict
    if git status | grep -q "You have unmerged paths"; then
      echo "Conflict detected during git merge" >&2
      exit 1
    else
      echo "git merge failed with exit code $EXIT_CODE" >&2
      exit 2
    fi
  fi

  # Commit the merged changes
  if [ -n "$(git status --porcelain)" ]; then
    git commit -m "feat(${FEATURE_NAME}): merge from worktree branch ${FEATURE_BRANCH}"
    echo "Changes committed to $MAIN_BRANCH"
  fi
fi

# Cleanup: Remove worktree
WORKTREE_PATH=".kiro/worktrees/specs/${FEATURE_NAME}"
if [ -d "$WORKTREE_PATH" ]; then
  if git worktree remove "$WORKTREE_PATH" 2>&1; then
    echo "Worktree removed: $WORKTREE_PATH"
  else
    echo "Warning: Failed to remove worktree $WORKTREE_PATH (you may need to clean up manually)" >&2
    # Continue execution (non-fatal)
  fi
else
  echo "Worktree path not found: $WORKTREE_PATH (may already be removed)"
fi

# Cleanup: Delete feature branch
if git show-ref --verify --quiet "refs/heads/$FEATURE_BRANCH"; then
  if git branch -D "$FEATURE_BRANCH" 2>&1; then
    echo "Feature branch deleted: $FEATURE_BRANCH"
  else
    echo "Warning: Failed to delete branch $FEATURE_BRANCH (you may need to clean up manually)" >&2
    # Continue execution (non-fatal)
  fi
else
  echo "Feature branch not found: $FEATURE_BRANCH (may already be deleted)"
fi

echo "Success: Merge completed, worktree and branch cleaned up"
exit 0
