#!/usr/bin/env bash
# Test suite for rebase-worktree.sh

set -euo pipefail

TEST_DIR="$(mktemp -d)"
SCRIPT_PATH="$(dirname "$0")/rebase-worktree.sh"

cleanup() {
  rm -rf "$TEST_DIR"
}
trap cleanup EXIT

# Test 1: jq not installed error
test_jq_not_installed() {
  echo "Test 1: jq not installed error"

  # Mock jq command not found
  PATH="/usr/bin:/bin" # Minimal PATH without jq

  output=$("$SCRIPT_PATH" "test-feature" 2>&1 || true)
  exit_code=$?

  if [[ $exit_code -ne 2 ]]; then
    echo "FAIL: Expected exit code 2, got $exit_code"
    return 1
  fi

  if [[ ! "$output" =~ "jq" ]]; then
    echo "FAIL: Expected jq error message"
    return 1
  fi

  echo "PASS"
}

# Test 2: Feature name not provided
test_no_feature_name() {
  echo "Test 2: Feature name not provided"

  output=$("$SCRIPT_PATH" 2>&1 || true)
  exit_code=$?

  if [[ $exit_code -ne 2 ]]; then
    echo "FAIL: Expected exit code 2, got $exit_code"
    return 1
  fi

  echo "PASS"
}

# Test 3: spec.json/bug.json not found
test_spec_not_found() {
  echo "Test 3: spec.json/bug.json not found"

  cd "$TEST_DIR"
  mkdir -p .kiro/specs/missing-feature

  output=$("$SCRIPT_PATH" "missing-feature" 2>&1 || true)
  exit_code=$?

  if [[ $exit_code -ne 2 ]]; then
    echo "FAIL: Expected exit code 2, got $exit_code"
    return 1
  fi

  echo "PASS"
}

# Test 4: jj available - rebase execution
test_jj_rebase() {
  echo "Test 4: jj available - rebase execution"

  cd "$TEST_DIR"
  git init
  git commit --allow-empty -m "Initial commit"

  mkdir -p .kiro/specs/test-feature
  echo '{"worktree":{"branch":"feature/test"}}' > .kiro/specs/test-feature/spec.json

  # Mock jj command
  mkdir -p bin
  cat > bin/jj <<'EOF'
#!/bin/bash
echo "Rebased successfully"
exit 0
EOF
  chmod +x bin/jj

  PATH="$TEST_DIR/bin:$PATH" output=$("$SCRIPT_PATH" "test-feature" 2>&1)
  exit_code=$?

  if [[ $exit_code -ne 0 ]]; then
    echo "FAIL: Expected exit code 0, got $exit_code"
    return 1
  fi

  echo "PASS"
}

# Test 5: git fallback - no jj
test_git_fallback() {
  echo "Test 5: git fallback - no jj"

  cd "$TEST_DIR"
  git init
  git commit --allow-empty -m "Initial commit"

  mkdir -p .kiro/specs/test-feature
  echo '{"worktree":{"branch":"feature/test"}}' > .kiro/specs/test-feature/spec.json

  # Ensure jj is not in PATH
  PATH="/usr/bin:/bin" output=$("$SCRIPT_PATH" "test-feature" 2>&1 || true)
  exit_code=$?

  # Should attempt git rebase
  if [[ ! "$output" =~ "git rebase" ]]; then
    echo "FAIL: Expected git rebase attempt"
    return 1
  fi

  echo "PASS"
}

# Run tests
echo "Running rebase-worktree.sh tests..."
test_jq_not_installed
test_no_feature_name
test_spec_not_found
test_jj_rebase
test_git_fallback

echo "All tests passed!"
