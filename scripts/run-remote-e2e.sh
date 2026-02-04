#!/bin/bash

# Remote E2E Execution Script
# リモートMacOSマシンでE2Eテストを実行するメインスクリプト
#
# NOTE: Do not run this script directly. Use Taskfile instead:
#   task electron:test:e2e:remote   - Run E2E tests on remote machine
#
# Required Environment Variables:
#   REMOTE_E2E_HOST  - リモートホスト名またはIP
#   REMOTE_E2E_USER  - SSHユーザー名
#
# Exit Codes:
#   0: 全テスト成功
#   1: テスト失敗
#   2: 環境変数未設定
#   3: SSH接続失敗
#   4: rsync失敗
#   5: npm ci失敗
#   6: ビルド失敗
#   124: タイムアウト（timeoutコマンドの終了コード）

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ELECTRON_DIR="$PROJECT_DIR/electron-sdd-manager"

# リモートキャッシュディレクトリ
REMOTE_CACHE_DIR="~/.sdd-e2e-cache"
REMOTE_WORKSPACE="$REMOTE_CACHE_DIR/electron-sdd-manager"
REMOTE_HASH_FILE="$REMOTE_CACHE_DIR/.package-lock-hash"

# タイムアウト設定（15分）
E2E_TIMEOUT="${E2E_TIMEOUT:-900}"

# カラー出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# エラーハンドリング
error_exit() {
    local exit_code=$1
    local message=$2
    echo -e "${RED}ERROR:${NC} $message" >&2
    exit "$exit_code"
}

# 環境変数チェック
check_env_vars() {
    echo -e "${BLUE}[1/5] Checking environment variables...${NC}"

    if [ -z "$REMOTE_E2E_HOST" ]; then
        error_exit 2 "REMOTE_E2E_HOST is not set"
    fi

    if [ -z "$REMOTE_E2E_USER" ]; then
        error_exit 2 "REMOTE_E2E_USER is not set"
    fi

    echo -e "  Remote: ${GREEN}$REMOTE_E2E_USER@$REMOTE_E2E_HOST${NC}"
}

# SSH接続テスト
test_ssh_connection() {
    local remote="$REMOTE_E2E_USER@$REMOTE_E2E_HOST"

    if ! ssh -o BatchMode=yes -o ConnectTimeout=10 "$remote" "echo 'ok'" > /dev/null 2>&1; then
        error_exit 3 "SSH connection error: $remote"
    fi
}

# リモートでコマンドを実行するヘルパー
remote_exec() {
    local remote="$REMOTE_E2E_USER@$REMOTE_E2E_HOST"
    ssh -o BatchMode=yes "$remote" "$@"
}

# rsyncでファイル転送
sync_files() {
    echo -e "${BLUE}[2/5] Syncing files to remote...${NC}"

    local remote="$REMOTE_E2E_USER@$REMOTE_E2E_HOST"

    # リモートディレクトリを作成
    remote_exec "mkdir -p $REMOTE_CACHE_DIR"

    # rsync実行
    # -a: アーカイブモード（権限、タイムスタンプ保持）
    # -v: 詳細表示
    # -z: 圧縮転送
    # --delete: ローカルで削除されたファイルをリモートでも削除
    # --exclude: 除外パターン
    echo "  Transferring electron-sdd-manager/ ..."

    if ! rsync -avz --delete \
        --exclude='node_modules/' \
        --exclude='dist/' \
        --exclude='.git/' \
        --exclude='release/' \
        --exclude='.vite/' \
        --exclude='coverage/' \
        "$ELECTRON_DIR/" \
        "$remote:$REMOTE_WORKSPACE/"; then
        error_exit 4 "rsync failed"
    fi

    echo -e "  ${GREEN}Files synced successfully${NC}"
}

# package-lock.jsonのハッシュを計算
calculate_hash() {
    local file="$1"
    # macOSとLinuxの両方で動作するようにmd5コマンドを使用
    if command -v md5 > /dev/null; then
        md5 -q "$file"
    elif command -v md5sum > /dev/null; then
        md5sum "$file" | cut -d' ' -f1
    else
        # sha256sumにフォールバック
        shasum -a 256 "$file" | cut -d' ' -f1
    fi
}

# 依存関係の管理（npm ci）
manage_dependencies() {
    echo -e "${BLUE}[3/5] Managing dependencies...${NC}"

    local remote="$REMOTE_E2E_USER@$REMOTE_E2E_HOST"

    # ローカルのpackage-lock.jsonのハッシュを計算
    local local_hash
    local_hash=$(calculate_hash "$ELECTRON_DIR/package-lock.json")
    echo "  Local package-lock.json hash: $local_hash"

    # リモートの保存済みハッシュを取得
    local remote_hash
    remote_hash=$(remote_exec "cat $REMOTE_HASH_FILE 2>/dev/null || echo ''")
    echo "  Remote cached hash: ${remote_hash:-<none>}"

    if [ "$local_hash" = "$remote_hash" ]; then
        echo -e "  ${GREEN}Dependencies unchanged, skipping npm ci${NC}"
    else
        echo "  Dependencies changed, running npm ci..."

        # npm ciを実行
        if ! remote_exec "cd $REMOTE_WORKSPACE && npm ci"; then
            error_exit 5 "npm ci failed"
        fi

        # 新しいハッシュを保存
        remote_exec "echo '$local_hash' > $REMOTE_HASH_FILE"
        echo -e "  ${GREEN}Dependencies installed successfully${NC}"
    fi
}

# ビルド実行
run_build() {
    echo -e "${BLUE}[4/5] Building on remote...${NC}"

    if ! remote_exec "cd $REMOTE_WORKSPACE && npm run build"; then
        error_exit 6 "Build failed"
    fi

    echo -e "  ${GREEN}Build completed successfully${NC}"
}

# E2Eテスト実行
run_e2e_tests() {
    echo -e "${BLUE}[5/5] Running E2E tests on remote...${NC}"

    local remote="$REMOTE_E2E_USER@$REMOTE_E2E_HOST"

    # 一時ファイルに出力を保存
    local temp_output
    temp_output=$(mktemp)

    # タイムアウト付きでE2Eテストを実行
    # timeout コマンドがない場合は直接実行
    local exit_code=0

    echo "  Timeout: ${E2E_TIMEOUT}s"
    echo "  Running task electron:test:e2e..."
    echo ""

    if command -v timeout > /dev/null; then
        # GNU timeout (Linux)
        timeout --signal=TERM "$E2E_TIMEOUT" ssh -o BatchMode=yes "$remote" \
            "cd $REMOTE_WORKSPACE && cd .. && task electron:test:e2e" 2>&1 | tee "$temp_output" || exit_code=$?
    elif command -v gtimeout > /dev/null; then
        # GNU timeout installed via Homebrew (macOS)
        gtimeout --signal=TERM "$E2E_TIMEOUT" ssh -o BatchMode=yes "$remote" \
            "cd $REMOTE_WORKSPACE && cd .. && task electron:test:e2e" 2>&1 | tee "$temp_output" || exit_code=$?
    else
        # macOS without GNU coreutils - use perl for timeout
        # perl -e 'alarm shift; exec @ARGV' -- $timeout command args
        perl -e 'alarm shift; exec @ARGV' -- "$E2E_TIMEOUT" \
            ssh -o BatchMode=yes "$remote" \
            "cd $REMOTE_WORKSPACE && cd .. && task electron:test:e2e" 2>&1 | tee "$temp_output" || exit_code=$?
    fi

    echo ""

    # タイムアウトの場合（exit code 124 or 142 from timeout/alarm）
    if [ "$exit_code" -eq 124 ] || [ "$exit_code" -eq 142 ]; then
        rm -f "$temp_output"
        error_exit 124 "Timeout: E2E test exceeded ${E2E_TIMEOUT} seconds ($(( E2E_TIMEOUT / 60 )) minutes)"
    fi

    # 結果をパース
    echo -e "${BLUE}=== E2E Test Result ===${NC}"
    "$SCRIPT_DIR/parse-e2e-result.sh" < "$temp_output"
    local parse_exit_code=$?

    rm -f "$temp_output"

    # parse-e2e-result.shの終了コードを返す
    exit $parse_exit_code
}

# メイン処理
main() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Remote E2E Test Execution${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""

    check_env_vars
    test_ssh_connection
    sync_files
    manage_dependencies
    run_build
    run_e2e_tests
}

main "$@"
