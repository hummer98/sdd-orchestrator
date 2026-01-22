#!/bin/bash
# update-bug-for-deploy.sh
# Bugデプロイ準備スクリプト: worktree内でbug.jsonを更新してコミット
# Requirements: 2.1, 2.2, 2.3, 2.4
#
# Usage: update-bug-for-deploy.sh <bug-name>
# Exit codes:
#   0 - Success
#   1 - jq not found / bug.json not found / missing argument
#   * - git exit code on commit failure

set -e

# Check argument
if [ -z "$1" ]; then
  echo "Error: bug-name is required"
  echo "Usage: update-bug-for-deploy.sh <bug-name>"
  exit 1
fi

BUG_NAME="$1"
BUG_JSON=".kiro/bugs/${BUG_NAME}/bug.json"

# Preconditions: Check if jq is installed
command -v jq >/dev/null 2>&1 || { echo "Error: jq is not installed. Install with: brew install jq (macOS) or apt install jq (Linux)"; exit 1; }

# Preconditions: Check if bug.json exists
[ -f "$BUG_JSON" ] || { echo "Error: $BUG_JSON not found"; exit 1; }

# Transform JSON
# - Remove worktree field
# - Update updated_at to current UTC timestamp
# Note: Unlike spec.json, bug.json does not have a phase field
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
jq --arg ts "$TIMESTAMP" '
  del(.worktree) |
  .updated_at = $ts
' "$BUG_JSON" > "${BUG_JSON}.tmp" && mv "${BUG_JSON}.tmp" "$BUG_JSON"

# Commit
git add "$BUG_JSON"
git commit -m "chore(${BUG_NAME}): update bug.json for deploy-complete"

echo "Success: bug.json updated and committed for deploy-complete"
