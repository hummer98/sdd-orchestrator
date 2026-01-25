#!/bin/bash
# create-spec-worktree.sh
# Spec用worktree作成スクリプト: feature/<feature-name>ブランチを作成し、worktreeを配置
# Requirements: 1.1, 1.2, 1.5, 1.6
#
# Usage: create-spec-worktree.sh <feature-name>
# Exit codes:
#   0 - Success
#   1 - Error (missing argument, branch exists, worktree exists)

set -e

# Check argument
if [ -z "$1" ]; then
  echo "Error: feature-name is required"
  echo "Usage: create-spec-worktree.sh <feature-name>"
  exit 1
fi

FEATURE_NAME="$1"
BRANCH_NAME="feature/${FEATURE_NAME}"
WORKTREE_PATH=".kiro/worktrees/specs/${FEATURE_NAME}"

# Check if branch already exists
if git rev-parse --verify "${BRANCH_NAME}" >/dev/null 2>&1; then
  echo "Error: Branch ${BRANCH_NAME} already exists"
  exit 1
fi

# Check if worktree directory already exists
if [ -d "${WORKTREE_PATH}" ]; then
  echo "Error: Worktree directory already exists at ${WORKTREE_PATH}"
  exit 1
fi

# Create worktree with new branch
git worktree add -b "${BRANCH_NAME}" "${WORKTREE_PATH}"

echo "Success: Created worktree at ${WORKTREE_PATH}"
