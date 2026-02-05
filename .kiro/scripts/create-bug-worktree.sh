#!/bin/bash
# create-bug-worktree.sh
# Bug用worktree作成スクリプト: bugfix/ブランチとworktreeを同時作成
# Requirements: 1.3, 1.4, 1.5, 1.6
# vcs-scheme-switching: Task 5.2 - VCSスキーム対応
# Requirements: 4.6 (vcs-scheme-switching)
#
# Usage: create-bug-worktree.sh <bug-name> [git|jj]
#        VCS_SCHEME=jj create-bug-worktree.sh <bug-name>
# Exit codes:
#   0 - Success
#   1 - Error (missing argument, branch exists, worktree exists, jj command failed)

set -e

# Check argument
if [ -z "$1" ]; then
  echo "Error: bug-name is required"
  echo "Usage: create-bug-worktree.sh <bug-name> [git|jj]"
  exit 1
fi

BUG_NAME="$1"
BRANCH_NAME="bugfix/${BUG_NAME}"
WORKTREE_PATH=".kiro/worktrees/bugs/${BUG_NAME}"

# Determine VCS scheme (argument > environment > default)
if [ -n "$2" ]; then
  VCS_SCHEME="$2"
elif [ -z "$VCS_SCHEME" ]; then
  VCS_SCHEME="git"
fi

# Validate VCS scheme
if [ "$VCS_SCHEME" != "git" ] && [ "$VCS_SCHEME" != "jj" ]; then
  echo "Error: Invalid VCS scheme '$VCS_SCHEME'. Must be 'git' or 'jj'"
  exit 1
fi

echo "Using VCS scheme: $VCS_SCHEME"

# Check if worktree directory already exists (common for both git and jj)
if [ -d "${WORKTREE_PATH}" ]; then
  echo "Error: Worktree directory already exists at ${WORKTREE_PATH}"
  exit 1
fi

if [ "$VCS_SCHEME" = "jj" ]; then
  # jj mode
  # Requirements: 4.6

  # Check if jj is available
  if ! command -v jj >/dev/null 2>&1; then
    echo "Error: jj is not installed"
    exit 1
  fi

  # Check if bookmark already exists
  if jj bookmark list 2>/dev/null | grep -q "^${BRANCH_NAME}:"; then
    echo "Error: Bookmark ${BRANCH_NAME} already exists"
    exit 1
  fi

  # Create jj workspace and bookmark
  echo "Creating jj workspace..."
  if ! jj workspace add -r @- "${WORKTREE_PATH}"; then
    echo "Error: Failed to create jj workspace" >&2
    exit 1
  fi

  echo "Creating jj bookmark..."
  if ! jj bookmark create "${BRANCH_NAME}"; then
    echo "Error: Failed to create jj bookmark. Rolling back workspace..." >&2
    jj workspace forget "${WORKTREE_PATH}" || true
    exit 1
  fi

  echo "Success: Created jj workspace at ${WORKTREE_PATH} with bookmark ${BRANCH_NAME}"

else
  # git mode (default)
  # Requirements: 4.6

  # Check if branch already exists
  if git rev-parse --verify "${BRANCH_NAME}" >/dev/null 2>&1; then
    echo "Error: Branch ${BRANCH_NAME} already exists"
    exit 1
  fi

  # Create worktree with new branch
  git worktree add -b "${BRANCH_NAME}" "${WORKTREE_PATH}"

  echo "Success: Created worktree at ${WORKTREE_PATH}"
fi
