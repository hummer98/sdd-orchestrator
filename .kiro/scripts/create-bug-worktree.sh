#!/bin/bash
# create-bug-worktree.sh
# Bug用worktree作成スクリプト: bugfix/ブランチとworktreeを同時作成
# Requirements: 1.3, 1.4, 1.5, 1.6
#
# Usage: create-bug-worktree.sh <bug-name>
# Exit codes:
#   0 - Success
#   1 - Error (missing argument, branch exists, worktree exists)

set -e

# Check argument
if [ -z "$1" ]; then
  echo "Error: bug-name is required"
  echo "Usage: create-bug-worktree.sh <bug-name>"
  exit 1
fi

BUG_NAME="$1"
BRANCH_NAME="bugfix/${BUG_NAME}"
WORKTREE_PATH=".kiro/worktrees/bugs/${BUG_NAME}"

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
