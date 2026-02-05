#!/bin/bash
# merge-spec.sh
# Specマージスクリプト: worktreeブランチをmainブランチにマージ
# jj優先、gitフォールバック方式
#
# Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
#
# Usage: merge-spec.sh <feature-name>
# Exit codes:
#   0 - Success (マージ完了、worktree削除、ブランチ削除)
#   1 - Conflict (マージ中断、worktree削除せず)
#   2 - Error (jq不在、spec.json不在、引数不足、非標準ブランチ)

set -e

# Check argument
if [ -z "$1" ]; then
  echo "Error: feature-name is required" >&2
  echo "Usage: merge-spec.sh <feature-name>" >&2
  exit 2
fi

FEATURE_NAME="$1"
WORKTREE_PATH=".kiro/worktrees/specs/${FEATURE_NAME}"
WORKTREE_SPEC_JSON="${WORKTREE_PATH}/.kiro/specs/${FEATURE_NAME}/spec.json"
MAIN_SPEC_JSON=".kiro/specs/${FEATURE_NAME}/spec.json"

# Preconditions: Check if jq is installed (Requirement 6.1)
if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq is not installed. Install with: brew install jq (macOS) or apt install jq (Linux)" >&2
  exit 2
fi

# Preconditions: Check current branch is main/master/dev (Requirement 1.2, 6.4)
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ] && [ "$CURRENT_BRANCH" != "dev" ]; then
  echo "Error: Must be on main/master/dev branch. Current: $CURRENT_BRANCH" >&2
  exit 2
fi

# Preconditions: Check if spec.json exists (Requirement 6.2)
if [ -f "$WORKTREE_SPEC_JSON" ]; then
  SPEC_JSON="$WORKTREE_SPEC_JSON"
  echo "Using spec.json from worktree: $SPEC_JSON"
elif [ -f "$MAIN_SPEC_JSON" ]; then
  SPEC_JSON="$MAIN_SPEC_JSON"
  echo "Using spec.json from main: $SPEC_JSON"
else
  echo "Error: spec.json not found at $WORKTREE_SPEC_JSON" >&2
  exit 2
fi

# Phase 1: Read worktree.branch BEFORE updating JSON (Requirement 1.1, 6.3)
FEATURE_BRANCH=$(jq -r '.worktree.branch' "$SPEC_JSON")
if [ -z "$FEATURE_BRANCH" ] || [ "$FEATURE_BRANCH" = "null" ]; then
  echo "Error: worktree.branch not found in $SPEC_JSON" >&2
  exit 2
fi

echo "Feature branch: $FEATURE_BRANCH"
echo "Current branch: $CURRENT_BRANCH"

# Phase 2: Update spec.json in worktree (Requirement 1.3)
if [ -f "$WORKTREE_SPEC_JSON" ]; then
  echo "Updating spec.json in worktree..."
  TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  jq --arg ts "$TIMESTAMP" '
    del(.worktree) |
    .phase = "deploy-complete" |
    .updated_at = $ts
  ' "$WORKTREE_SPEC_JSON" > "${WORKTREE_SPEC_JSON}.tmp" && mv "${WORKTREE_SPEC_JSON}.tmp" "$WORKTREE_SPEC_JSON"
  echo "spec.json updated: worktree field removed, phase set to deploy-complete"

  # Phase 2.5: Commit the changes in worktree (Requirement 1.4)
  echo "Committing spec.json changes in worktree..."
  (cd "$WORKTREE_PATH" && git add ".kiro/specs/${FEATURE_NAME}/spec.json" && git commit -m "chore(${FEATURE_NAME}): update spec.json for deploy-complete") || {
    echo "Warning: Failed to commit spec.json changes in worktree (may already be committed)" >&2
  }
fi

# Phase 3: Perform merge (Requirement 1.5, 1.6)
echo "Merging branch $FEATURE_BRANCH into $CURRENT_BRANCH..."

# Check if jj is available
if command -v jj >/dev/null 2>&1; then
  echo "Using jj for merge (conflict-tolerant)..."

  # Use jj squash to merge
  if jj squash --from "$FEATURE_BRANCH" --into "$CURRENT_BRANCH" 2>&1; then
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
    echo "Changes committed to $CURRENT_BRANCH"
  fi
else
  echo "jj not found, falling back to git merge..."

  # Use git merge --squash as fallback
  if git merge --squash "$FEATURE_BRANCH" 2>&1; then
    echo "git merge --squash completed"
  else
    EXIT_CODE=$?
    # Check if it's a conflict (Requirement 6.5)
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
    echo "Changes committed to $CURRENT_BRANCH"
  fi
fi

# Phase 4: Cleanup worktree (Requirement 1.7, 6.6)
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

# Phase 5: Cleanup feature branch (Requirement 1.8, 6.7)
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
