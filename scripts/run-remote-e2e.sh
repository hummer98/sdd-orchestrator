#!/bin/bash

# Remote E2E Test Execution Script
# リモートMacOSマシンでビルド＋E2Eテストを実行するメインスクリプト
#
# NOTE: Do not run this script directly. Use Taskfile instead:
#   task electron:test:e2e:remote           - Full E2E tests on remote machine
#   task electron:test:e2e:remote:kdg069    - Full E2E on KDG-069
#
# Usage:
#   ./scripts/run-remote-e2e.sh             - フルE2Eテスト実行
#   ./scripts/run-remote-e2e.sh --smoke     - スモークテストのみ（起動確認）
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

# タイムアウト設定（30分 - 80件のE2Eテストには十分な時間が必要）
E2E_TIMEOUT="${E2E_TIMEOUT:-1800}"

# モード判定
SMOKE_ONLY=false
if [ "$1" = "--smoke" ]; then
    SMOKE_ONLY=true
fi

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

    local mode="Full E2E"
    if $SMOKE_ONLY; then
        mode="Smoke Test"
    fi
    echo -e "  Remote: ${GREEN}$REMOTE_E2E_USER@$REMOTE_E2E_HOST${NC}"
    echo -e "  Mode: ${GREEN}$mode${NC}"
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
    ssh -o BatchMode=yes -o ServerAliveInterval=60 "$remote" "$@"
}

# rsyncでファイル転送
sync_files() {
    echo -e "${BLUE}[2/5] Syncing files to remote...${NC}"

    local remote="$REMOTE_E2E_USER@$REMOTE_E2E_HOST"

    # リモートディレクトリを作成
    remote_exec "mkdir -p $REMOTE_CACHE_DIR"

    # rsync実行
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

    # fixtureリセット用にgitリポジトリを初期化
    # wdio.conf.tsはgitRoot = projectRoot/.. でfixtureをrestoreする
    # ローカルではsdd-orchestrator/がgitルート、リモートでは~/.sdd-e2e-cache/に相当
    echo "  Initializing git repo for fixture restore..."
    remote_exec "rm -rf $REMOTE_WORKSPACE/.git 2>/dev/null; \
        cd $REMOTE_CACHE_DIR && \
        echo 'node_modules/' > .gitignore && \
        echo 'dist/' >> .gitignore && \
        echo '.vite/' >> .gitignore && \
        echo 'logs/' >> .gitignore && \
        git init -q && \
        git add -A && \
        git commit -q --allow-empty -m 'fixture baseline'" 2>/dev/null || true

    echo -e "  ${GREEN}Files synced successfully${NC}"
}

# package-lock.jsonのハッシュを計算
calculate_hash() {
    local file="$1"
    if command -v md5 > /dev/null; then
        md5 -q "$file"
    elif command -v md5sum > /dev/null; then
        md5sum "$file" | cut -d' ' -f1
    else
        shasum -a 256 "$file" | cut -d' ' -f1
    fi
}

# 依存関係の管理（npm ci）
manage_dependencies() {
    echo -e "${BLUE}[3/5] Managing dependencies...${NC}"

    local remote="$REMOTE_E2E_USER@$REMOTE_E2E_HOST"

    local local_hash
    local_hash=$(calculate_hash "$ELECTRON_DIR/package-lock.json")
    echo "  Local package-lock.json hash: $local_hash"

    local remote_hash
    remote_hash=$(remote_exec "cat $REMOTE_HASH_FILE 2>/dev/null || echo ''")
    echo "  Remote cached hash: ${remote_hash:-<none>}"

    if [ "$local_hash" = "$remote_hash" ]; then
        echo -e "  ${GREEN}Dependencies unchanged, skipping npm ci${NC}"
    else
        echo "  Dependencies changed, running npm install..."

        if ! remote_exec "cd $REMOTE_WORKSPACE && npm install"; then
            error_exit 5 "npm install failed"
        fi

        # Electronと互換性のないネイティブモジュールをスタブに置き換え
        echo "  Patching incompatible native modules for Electron..."
        remote_exec "echo 'module.exports = function() { return {}; };' > $REMOTE_WORKSPACE/node_modules/cpu-features/lib/index.js"

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

# フルE2Eテスト実行
# リモートでWDIOを実行し、結果をリモートのログファイルに保存後、取得してパースする
# SSH経由のストリーミングは出力量が多すぎるため、リモート側でファイルに保存する方式を採用
run_e2e_tests() {
    echo -e "${BLUE}[5/5] Running full E2E tests on remote...${NC}"

    local remote="$REMOTE_E2E_USER@$REMOTE_E2E_HOST"
    local remote_log="$REMOTE_WORKSPACE/logs/e2e-result.log"

    echo "  Timeout: ${E2E_TIMEOUT}s"
    echo "  Running wdio E2E tests..."
    echo ""

    # リモートでWDIOを実行し、出力をファイルに保存
    # PASSED/FAILEDの行だけリアルタイムで表示する
    local exit_code=0
    remote_exec "cd $REMOTE_WORKSPACE && \
        mkdir -p logs && \
        npx wdio run wdio.conf.ts > $remote_log 2>&1; \
        echo \"E2E_EXIT_CODE=\$?\" >> $remote_log" || true

    # PASSED/FAILED行を表示（進捗確認用）
    echo ""
    echo -e "${BLUE}--- Spec Results ---${NC}"
    remote_exec "grep -E '^\[0-[0-9]+\] (PASSED|FAILED)' $remote_log" || true
    echo -e "${BLUE}--- End ---${NC}"
    echo ""

    # 結果ファイルをローカルに取得
    local temp_output
    temp_output=$(mktemp)
    scp -o BatchMode=yes "$remote:$remote_log" "$temp_output" 2>/dev/null

    # 結果をパース
    echo -e "${BLUE}=== E2E Test Result ===${NC}"
    "$SCRIPT_DIR/parse-e2e-result.sh" < "$temp_output"
    local parse_exit_code=$?

    rm -f "$temp_output"

    exit $parse_exit_code
}

# スモークテスト実行
run_smoke_test() {
    echo -e "${BLUE}[5/5] Running smoke test on remote...${NC}"

    local test_project="$REMOTE_WORKSPACE/e2e-wdio/fixtures/test-project"
    local log_file="$REMOTE_WORKSPACE/logs/main.log"
    local stdout_log="$REMOTE_WORKSPACE/logs/stdout.log"
    local smoke_timeout=30

    echo "  Test project: $test_project"
    echo "  Timeout: ${smoke_timeout}s"

    # 1. クリーンアップ
    echo "  Cleaning up..."
    remote_exec "pkill -f 'Electron.*dist/main' 2>/dev/null || true; \
        rm -f $log_file $stdout_log; \
        mkdir -p $REMOTE_WORKSPACE/logs" || true

    # 2. ラッパースクリプトを作成して open 経由で起動（Aquaセッション）
    echo "  Launching Electron via wrapper script (Aqua session)..."
    remote_exec "cat > /tmp/sdd-smoke-test.sh << 'SCRIPT'
#!/bin/bash
WORKSPACE=\$HOME/.sdd-e2e-cache/electron-sdd-manager
export SDD_LOG_DIR=\"\$WORKSPACE/logs\"
mkdir -p \"\$SDD_LOG_DIR\"
exec \"\$WORKSPACE/node_modules/.bin/electron\" \
    \"--app=\$WORKSPACE/dist/main/index.js\" \
    \"--project=\$WORKSPACE/e2e-wdio/fixtures/test-project\" \
    > \"\$SDD_LOG_DIR/stdout.log\" 2>&1
SCRIPT
chmod +x /tmp/sdd-smoke-test.sh"

    remote_exec "open -a Terminal /tmp/sdd-smoke-test.sh"

    # 3. ログを監視して起動を確認
    echo "  Waiting for app startup..."
    local elapsed=0
    local started=false
    local has_error=false

    while [ "$elapsed" -lt "$smoke_timeout" ]; do
        sleep 2
        elapsed=$((elapsed + 2))

        local log_exists=false
        if remote_exec "test -f $log_file" 2>/dev/null; then
            log_exists=true
        elif remote_exec "test -f $stdout_log" 2>/dev/null; then
            log_exists=true
        fi

        if ! $log_exists; then
            echo "  [$elapsed/${smoke_timeout}s] Waiting for log file..."
            continue
        fi

        if ! $started; then
            if remote_exec "grep -q 'Logger initialized' $log_file $stdout_log 2>/dev/null"; then
                echo -e "  [$elapsed/${smoke_timeout}s] ${GREEN}App started successfully${NC}"
                started=true
            fi
        fi

        if $started; then
            if remote_exec "grep -q 'Project set:' $log_file $stdout_log 2>/dev/null"; then
                echo -e "  [$elapsed/${smoke_timeout}s] ${GREEN}Project loaded successfully${NC}"
                break
            fi
        fi

        if remote_exec "grep -q 'App threw an error during load' $stdout_log 2>/dev/null"; then
            has_error=true
            echo -e "  [$elapsed/${smoke_timeout}s] ${RED}App crashed during load${NC}"
            break
        fi

        if remote_exec "grep -q '\[ERROR\].*\(Uncaught\|Unhandled\|FATAL\)' $log_file $stdout_log 2>/dev/null"; then
            has_error=true
            echo -e "  [$elapsed/${smoke_timeout}s] ${RED}Fatal error detected in logs${NC}"
            break
        fi

        echo "  [$elapsed/${smoke_timeout}s] Monitoring..."
    done

    # 4. Electron プロセスを停止
    echo "  Stopping Electron..."
    remote_exec "pkill -f 'Electron.*dist/main' 2>/dev/null || true"
    sleep 1

    # 5. 結果を表示
    echo ""
    echo -e "${BLUE}=== Smoke Test Result ===${NC}"
    echo ""

    if remote_exec "test -f $log_file" 2>/dev/null; then
        echo -e "${BLUE}--- main.log ---${NC}"
        remote_exec "cat $log_file"
        echo -e "${BLUE}--- End ---${NC}"
        echo ""
    fi
    if remote_exec "test -f $stdout_log" 2>/dev/null; then
        local stdout_size
        stdout_size=$(remote_exec "wc -c < $stdout_log 2>/dev/null | tr -d ' '")
        if [ "${stdout_size:-0}" -gt 0 ]; then
            echo -e "${BLUE}--- stdout.log ---${NC}"
            remote_exec "head -50 $stdout_log"
            echo -e "${BLUE}--- End ---${NC}"
            echo ""
        fi
    fi

    if $has_error; then
        echo -e "${RED}SMOKE TEST FAILED${NC}"
        echo "  Reason: Error detected in logs"
        exit 1
    elif ! $started; then
        echo -e "${RED}SMOKE TEST FAILED${NC}"
        echo "  Reason: App did not start within ${smoke_timeout}s"
        exit 1
    else
        echo -e "${GREEN}SMOKE TEST PASSED${NC}"
        echo "  App started and loaded project without errors"
        exit 0
    fi
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

    if $SMOKE_ONLY; then
        run_smoke_test
    else
        run_e2e_tests
    fi
}

main "$@"
