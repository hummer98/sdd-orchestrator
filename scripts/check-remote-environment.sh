#!/bin/bash

# Remote Environment Check Script
# リモートマシンがE2E実行に必要な環境を満たしているか確認する
#
# NOTE: Do not run this script directly. Use Taskfile instead:
#   task electron:check:remote   - Check remote environment
#
# Required Environment Variables:
#   REMOTE_E2E_HOST  - リモートホスト名またはIP
#   REMOTE_E2E_USER  - SSHユーザー名
#
# Exit Codes:
#   0: 全チェック成功
#   1: いずれかのチェック失敗
#   2: 環境変数未設定

set -e

# カラー出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# チェック結果
CHECKS_PASSED=0
CHECKS_FAILED=0

# 成功メッセージ
check_passed() {
    local name="$1"
    local detail="$2"
    echo -e "  ${GREEN}[OK]${NC} $name"
    if [ -n "$detail" ]; then
        echo -e "      $detail"
    fi
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
}

# 失敗メッセージ（ヒント付き）
check_failed() {
    local name="$1"
    local hint="$2"
    echo -e "  ${RED}[NG]${NC} $name"
    if [ -n "$hint" ]; then
        echo -e "      ${YELLOW}Hint:${NC} $hint"
    fi
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
}

# 環境変数チェック
check_env_vars() {
    echo -e "${BLUE}=== Checking Environment Variables ===${NC}"

    if [ -z "$REMOTE_E2E_HOST" ]; then
        echo -e "${RED}ERROR: REMOTE_E2E_HOST is not set${NC}"
        echo -e "${YELLOW}Hint:${NC} Set the environment variable with the remote host name or IP"
        echo -e "  Example: export REMOTE_E2E_HOST=mac-mini.local"
        exit 2
    fi
    check_passed "REMOTE_E2E_HOST" "$REMOTE_E2E_HOST"

    if [ -z "$REMOTE_E2E_USER" ]; then
        echo -e "${RED}ERROR: REMOTE_E2E_USER is not set${NC}"
        echo -e "${YELLOW}Hint:${NC} Set the environment variable with the SSH username"
        echo -e "  Example: export REMOTE_E2E_USER=developer"
        exit 2
    fi
    check_passed "REMOTE_E2E_USER" "$REMOTE_E2E_USER"
    echo ""
}

# SSH接続チェック
check_ssh_connection() {
    echo -e "${BLUE}=== Checking SSH Connection ===${NC}"

    local remote="$REMOTE_E2E_USER@$REMOTE_E2E_HOST"

    if ssh -o BatchMode=yes -o ConnectTimeout=10 "$remote" "echo 'SSH connection successful'" > /dev/null 2>&1; then
        check_passed "SSH Connection" "$remote"
    else
        check_failed "SSH Connection to $remote" "Ensure SSH key is set up and the remote machine is accessible. Try: ssh $remote"
        echo ""
        return 1
    fi
    echo ""
}

# リモートでコマンドを実行するヘルパー
remote_exec() {
    local remote="$REMOTE_E2E_USER@$REMOTE_E2E_HOST"
    ssh -o BatchMode=yes -o ConnectTimeout=10 "$remote" "$@" 2>/dev/null
}

# Node.jsバージョンチェック
check_nodejs() {
    echo -e "${BLUE}=== Checking Node.js ===${NC}"

    local node_version
    node_version=$(remote_exec "node -v" 2>/dev/null || echo "")

    if [ -z "$node_version" ]; then
        check_failed "Node.js" "Install Node.js 20+ on the remote machine. Visit: https://nodejs.org/"
        return
    fi

    # バージョン番号を抽出 (v20.10.0 -> 20)
    local major_version
    major_version=$(echo "$node_version" | sed 's/v//' | cut -d. -f1)

    if [ "$major_version" -ge 20 ] 2>/dev/null; then
        check_passed "Node.js version >= 20" "$node_version"
    else
        check_failed "Node.js version >= 20" "Current version: $node_version. Upgrade to Node.js 20+."
    fi
    echo ""
}

# npmチェック
check_npm() {
    echo -e "${BLUE}=== Checking npm ===${NC}"

    local npm_version
    npm_version=$(remote_exec "npm -v" 2>/dev/null || echo "")

    if [ -n "$npm_version" ]; then
        check_passed "npm" "v$npm_version"
    else
        check_failed "npm" "npm is not found. It should be installed with Node.js."
    fi
    echo ""
}

# taskコマンドチェック
check_task() {
    echo -e "${BLUE}=== Checking task command ===${NC}"

    local task_version
    task_version=$(remote_exec "task --version" 2>/dev/null || echo "")

    if [ -n "$task_version" ]; then
        check_passed "task command" "$task_version"
    else
        check_failed "task command" "Install go-task. Visit: https://taskfile.dev/installation/ or run: brew install go-task"
    fi
    echo ""
}

# ディスプレイチェック（macOSのWindowServer）
check_display() {
    echo -e "${BLUE}=== Checking Display (WindowServer) ===${NC}"

    # WindowServerプロセスの確認
    local window_server
    window_server=$(remote_exec "pgrep -x WindowServer" 2>/dev/null || echo "")

    if [ -n "$window_server" ]; then
        check_passed "Display (WindowServer)" "PID: $window_server"
    else
        check_failed "Display (WindowServer)" "No display available. Ensure the remote Mac has a display connected or is logged in with a GUI session."
    fi
    echo ""
}

# 結果サマリー
print_summary() {
    echo -e "${BLUE}=== Summary ===${NC}"

    if [ "$CHECKS_FAILED" -eq 0 ]; then
        echo -e "${GREEN}All checks passed!${NC} ($CHECKS_PASSED checks)"
        echo ""
        echo -e "Remote machine is ready for E2E testing."
        echo -e "Run: ${YELLOW}task electron:test:e2e:remote${NC}"
    else
        echo -e "${RED}$CHECKS_FAILED check(s) failed${NC}, $CHECKS_PASSED passed"
        echo ""
        echo -e "Please fix the issues above before running remote E2E tests."
    fi
}

# メイン処理
main() {
    echo ""
    echo -e "${GREEN}==================================${NC}"
    echo -e "${GREEN}  Remote E2E Environment Checker  ${NC}"
    echo -e "${GREEN}==================================${NC}"
    echo ""

    check_env_vars

    if ! check_ssh_connection; then
        echo -e "${RED}Cannot proceed without SSH connection.${NC}"
        exit 1
    fi

    check_nodejs
    check_npm
    check_task
    check_display

    print_summary

    if [ "$CHECKS_FAILED" -gt 0 ]; then
        exit 1
    fi
    exit 0
}

main "$@"
