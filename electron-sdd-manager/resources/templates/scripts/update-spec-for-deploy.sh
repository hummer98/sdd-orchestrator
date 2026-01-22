#!/bin/bash
# update-spec-for-deploy.sh
# Specデプロイ準備スクリプト: worktree内でspec.jsonをdeploy-complete状態に更新してコミット
# Requirements: 1.1, 1.2, 1.3, 1.4
#
# Usage: update-spec-for-deploy.sh <feature-name>
# Exit codes:
#   0 - Success
#   1 - jq not found / spec.json not found / missing argument
#   * - git exit code on commit failure

set -e

# Check argument
if [ -z "$1" ]; then
  echo "Error: feature-name is required"
  echo "Usage: update-spec-for-deploy.sh <feature-name>"
  exit 1
fi

FEATURE_NAME="$1"
SPEC_JSON=".kiro/specs/${FEATURE_NAME}/spec.json"

# Preconditions: Check if jq is installed
command -v jq >/dev/null 2>&1 || { echo "Error: jq is not installed. Install with: brew install jq (macOS) or apt install jq (Linux)"; exit 1; }

# Preconditions: Check if spec.json exists
[ -f "$SPEC_JSON" ] || { echo "Error: $SPEC_JSON not found"; exit 1; }

# Transform JSON
# - Remove worktree field
# - Set phase to "deploy-complete"
# - Update updated_at to current UTC timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
jq --arg ts "$TIMESTAMP" '
  del(.worktree) |
  .phase = "deploy-complete" |
  .updated_at = $ts
' "$SPEC_JSON" > "${SPEC_JSON}.tmp" && mv "${SPEC_JSON}.tmp" "$SPEC_JSON"

# Commit
git add "$SPEC_JSON"
git commit -m "chore(${FEATURE_NAME}): update spec.json for deploy-complete"

echo "Success: spec.json updated and committed for deploy-complete"
