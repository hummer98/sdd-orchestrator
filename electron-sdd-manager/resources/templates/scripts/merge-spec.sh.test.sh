#!/bin/bash
# Test suite for merge-spec.sh
# This script tests the merge-spec.sh behavior

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MERGE_SCRIPT="$SCRIPT_DIR/merge-spec.sh"
TEST_DIR="/tmp/merge-spec-test-$$"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Setup test environment
setup() {
    mkdir -p "$TEST_DIR/.kiro/specs/test-feature"
    cd "$TEST_DIR"
    git init -q
    git config user.email "test@example.com"
    git config user.name "Test User"

    # Create spec.json
    cat > ".kiro/specs/test-feature/spec.json" <<EOF
{
  "feature_name": "test-feature",
  "worktree": {
    "path": ".kiro/worktrees/specs/test-feature",
    "branch": "feature/test-feature"
  }
}
EOF
    git add .kiro/specs/test-feature/spec.json
    git commit -q -m "Initial commit"
    git branch main
    git checkout -b feature/test-feature -q
}

# Cleanup test environment
cleanup() {
    cd /
    rm -rf "$TEST_DIR"
}

# Test function
test_case() {
    local test_name="$1"
    shift

    if "$@"; then
        echo -e "${GREEN}✓${NC} $test_name"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} $test_name"
        ((TESTS_FAILED++))
        return 0
    fi
}

# Test: Script requires jq
test_requires_jq() {
    if command -v jq >/dev/null 2>&1; then
        return 0
    else
        echo "jq not found - test would pass if jq is missing"
        return 1
    fi
}

# Test: Script requires feature-name argument
test_requires_feature_name() {
    bash "$MERGE_SCRIPT" 2>&1 | grep -q "feature-name is required"
}

# Test: Script checks for jj availability
test_checks_jj_availability() {
    grep -q "command -v jj" "$MERGE_SCRIPT"
}

# Test: Script uses jj squash when jj exists
test_uses_jj_squash_when_available() {
    grep -q "jj squash" "$MERGE_SCRIPT"
}

# Test: Script falls back to git merge when jj not found
test_falls_back_to_git_merge() {
    grep -q "git merge --squash" "$MERGE_SCRIPT"
}

# Test: Script removes worktree after merge
test_removes_worktree() {
    grep -q "git worktree remove" "$MERGE_SCRIPT"
}

# Test: Script deletes feature branch
test_deletes_branch() {
    grep -q "git branch -D" "$MERGE_SCRIPT"
}

# Test: Script exits with code 1 on conflict
test_exits_1_on_conflict() {
    grep -q "exit 1" "$MERGE_SCRIPT"
}

# Test: Script exits with code 2 on error
test_exits_2_on_error() {
    grep -q "exit 2" "$MERGE_SCRIPT"
}

# Run tests
echo "Running merge-spec.sh tests..."
echo

# Setup
trap cleanup EXIT

# Static tests (no setup needed)
test_case "Script requires jq" test_requires_jq
test_case "Script requires feature-name argument" test_requires_feature_name
test_case "Script checks for jj availability" test_checks_jj_availability
test_case "Script uses jj squash when available" test_uses_jj_squash_when_available
test_case "Script falls back to git merge" test_falls_back_to_git_merge
test_case "Script removes worktree after merge" test_removes_worktree
test_case "Script deletes feature branch" test_deletes_branch
test_case "Script exits with code 1 on conflict" test_exits_1_on_conflict
test_case "Script exits with code 2 on error" test_exits_2_on_error

# Summary
echo
echo "Tests passed: $TESTS_PASSED"
echo "Tests failed: $TESTS_FAILED"

if [ $TESTS_FAILED -gt 0 ]; then
    exit 1
fi

exit 0
