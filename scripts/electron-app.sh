#!/bin/bash

# Electron App Control Script
# 多重起動を防止しつつ、起動・停止・再起動を制御するスクリプト
#
# NOTE: Do not run this script directly. Use Taskfile instead:
#   task electron:start   - Start the app
#   task electron:stop    - Stop the app
#   task electron:restart - Restart the app
#   task electron:status  - Check status
#   task electron:logs    - View logs
#   task electron:dev     - Start in foreground

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ELECTRON_DIR="$PROJECT_DIR/electron-sdd-manager"
PID_FILE="$PROJECT_DIR/.electron-dev.pid"
LOG_FILE="$PROJECT_DIR/logs/electron-dev.log"

# カラー出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# IMPORTANT: Unset ELECTRON_RUN_AS_NODE to ensure Electron runs as Electron, not as Node.js
# This is critical when running from Claude Code or other Electron-based IDEs
unset ELECTRON_RUN_AS_NODE

# ログディレクトリ作成
mkdir -p "$(dirname "$LOG_FILE")"

# プロセスが実行中か確認
is_running() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        else
            # PIDファイルは存在するがプロセスは存在しない
            rm -f "$PID_FILE"
            return 1
        fi
    fi
    return 1
}

# npm run dev のプロセスを検索
find_dev_process() {
    # Viteの開発サーバープロセスを検索
    pgrep -f "vite.*electron-sdd-manager" 2>/dev/null || \
    pgrep -f "node.*vite.*$ELECTRON_DIR" 2>/dev/null || \
    pgrep -f "electron.*$ELECTRON_DIR" 2>/dev/null || \
    echo ""
}

# 起動
# 引数: $1 = プロジェクトパス (オプション)
start() {
    local project_path="$1"
    echo -e "${GREEN}Starting Electron app...${NC}"

    if is_running; then
        local pid=$(cat "$PID_FILE")
        echo -e "${YELLOW}App is already running (PID: $pid)${NC}"
        echo -e "Use '${YELLOW}task electron:restart${NC}' to restart"
        exit 1
    fi

    # 既存のプロセスがないか確認（Vite/nodeプロセス）
    local existing_pid=$(find_dev_process)
    if [ -n "$existing_pid" ]; then
        echo -e "${YELLOW}Found existing process (PID: $existing_pid). Stopping it first...${NC}"
        kill "$existing_pid" 2>/dev/null || true
        sleep 2
    fi

    # 起動前に孤立したElectronプロセスをクリーンアップ
    cleanup_orphaned_processes

    cd "$ELECTRON_DIR"

    # バックグラウンドで起動（環境変数でプロジェクトパスを渡す）
    if [ -n "$project_path" ]; then
        echo -e "Project path: ${GREEN}$project_path${NC}"
        SDD_PROJECT_PATH="$project_path" nohup npm run dev > "$LOG_FILE" 2>&1 &
    else
        nohup npm run dev > "$LOG_FILE" 2>&1 &
    fi
    local pid=$!
    echo "$pid" > "$PID_FILE"

    echo -e "${GREEN}App started (PID: $pid)${NC}"
    echo -e "Log file: $LOG_FILE"
    echo -e "Use '${YELLOW}task electron:logs${NC}' to view logs"
    echo -e "Use '${YELLOW}task electron:stop${NC}' to stop"
}

# tree-killでプロセスツリー全体を終了
kill_process_tree() {
    local pid=$1
    local signal=${2:-SIGTERM}

    # tree-killが利用可能か確認
    if command -v npx > /dev/null && [ -f "$ELECTRON_DIR/node_modules/.bin/tree-kill" ]; then
        echo "Using tree-kill to terminate process tree (PID: $pid)..."
        cd "$ELECTRON_DIR"
        npx tree-kill "$pid" "$signal" 2>/dev/null || true
    else
        # フォールバック: 手動で子プロセスを終了
        echo "tree-kill not available, using manual cleanup..."
        # 子プロセスを先に終了
        pkill -"$signal" -P "$pid" 2>/dev/null || true
        # 親プロセスを終了
        kill -"$signal" "$pid" 2>/dev/null || true
    fi
}

# 停止
stop() {
    echo -e "${YELLOW}Stopping Electron app...${NC}"

    if is_running; then
        local pid=$(cat "$PID_FILE")
        echo "Stopping process tree (PID: $pid)..."

        # tree-killでプロセスツリー全体をSIGTERMで終了
        kill_process_tree "$pid" "SIGTERM"

        # 最大5秒待機
        local count=0
        while [ $count -lt 5 ]; do
            if ! ps -p "$pid" > /dev/null 2>&1; then
                break
            fi
            sleep 1
            count=$((count + 1))
        done

        # まだ実行中ならSIGKILLでプロセスツリー全体を強制終了
        if ps -p "$pid" > /dev/null 2>&1; then
            echo "Force killing process tree..."
            kill_process_tree "$pid" "SIGKILL"
            sleep 1
        fi

        rm -f "$PID_FILE"
        echo -e "${GREEN}App stopped${NC}"
    else
        echo -e "${YELLOW}App is not running${NC}"
    fi

    # 残存プロセスのクリーンアップ（Electronプロセスが残っている場合）
    cleanup_orphaned_processes
}

# 孤立したプロセスのクリーンアップ
cleanup_orphaned_processes() {
    # Vite関連プロセス
    local vite_pids=$(pgrep -f "vite.*electron-sdd-manager" 2>/dev/null || true)

    # Electron関連プロセス（実際のコマンドラインにマッチするパターン）
    # 例: /path/to/electron-sdd-manager/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron .
    local electron_pids=$(pgrep -f "electron-sdd-manager/node_modules/electron" 2>/dev/null || true)

    # Node/npm関連プロセス
    local node_pids=$(pgrep -f "node.*electron-sdd-manager" 2>/dev/null || true)

    local all_pids="$vite_pids $electron_pids $node_pids"
    all_pids=$(echo "$all_pids" | tr ' ' '\n' | sort -u | tr '\n' ' ' | xargs)

    if [ -n "$all_pids" ]; then
        echo "Cleaning up orphaned processes: $all_pids"
        for pid in $all_pids; do
            if [ -n "$pid" ] && ps -p "$pid" > /dev/null 2>&1; then
                echo "  Terminating PID: $pid"
                kill -TERM "$pid" 2>/dev/null || true
            fi
        done
        sleep 2
        for pid in $all_pids; do
            if [ -n "$pid" ] && ps -p "$pid" > /dev/null 2>&1; then
                echo "  Force killing PID: $pid"
                kill -9 "$pid" 2>/dev/null || true
            fi
        done
    fi
}

# 再起動
# 引数: $1 = プロジェクトパス (オプション)
restart() {
    local project_path="$1"
    echo -e "${YELLOW}Restarting Electron app...${NC}"
    stop
    sleep 2
    start "$project_path"
}

# 状態確認
status() {
    if is_running; then
        local pid=$(cat "$PID_FILE")
        echo -e "${GREEN}App is running (PID: $pid)${NC}"

        # メモリ使用量などの追加情報
        if command -v ps > /dev/null; then
            echo ""
            echo "Process info:"
            ps -p "$pid" -o pid,ppid,%cpu,%mem,etime,command 2>/dev/null || true
        fi
    else
        local orphan_pid=$(find_dev_process)
        if [ -n "$orphan_pid" ]; then
            echo -e "${YELLOW}Found orphaned process (PID: $orphan_pid)${NC}"
            echo -e "Run '${YELLOW}task electron:stop${NC}' to clean up"
        else
            echo -e "${RED}App is not running${NC}"
        fi
    fi
}

# ログ表示
logs() {
    if [ -f "$LOG_FILE" ]; then
        echo -e "${GREEN}=== Electron Dev Logs ===${NC}"
        tail -f "$LOG_FILE"
    else
        echo -e "${YELLOW}No log file found at: $LOG_FILE${NC}"
    fi
}

# フォアグラウンドで起動（開発用）
# 引数: $1 = プロジェクトパス (オプション)
dev() {
    local project_path="$1"
    echo -e "${GREEN}Starting Electron app in foreground...${NC}"

    if is_running; then
        local pid=$(cat "$PID_FILE")
        echo -e "${YELLOW}App is already running in background (PID: $pid)${NC}"
        echo -e "Stop it first with '${YELLOW}task electron:stop${NC}'"
        exit 1
    fi

    # 既存のプロセスがないか確認
    local existing_pid=$(find_dev_process)
    if [ -n "$existing_pid" ]; then
        echo -e "${YELLOW}Found existing process (PID: $existing_pid). Stopping it first...${NC}"
        kill "$existing_pid" 2>/dev/null || true
        sleep 2
    fi

    # 起動前に孤立したElectronプロセスをクリーンアップ
    cleanup_orphaned_processes

    cd "$ELECTRON_DIR"
    if [ -n "$project_path" ]; then
        echo -e "Project path: ${GREEN}$project_path${NC}"
        SDD_PROJECT_PATH="$project_path" npm run dev
    else
        npm run dev
    fi
}

# ヘルプ表示
help() {
    echo "Electron App Control Script"
    echo ""
    echo "Usage: $0 <command> [project-path]"
    echo ""
    echo "Commands:"
    echo "  start [path]  - Start the app in background (optionally with project path)"
    echo "  stop          - Stop the running app"
    echo "  restart       - Restart the app"
    echo "  status        - Show app status"
    echo "  logs          - Show and follow logs"
    echo "  dev [path]    - Start in foreground (optionally with project path)"
    echo "  help          - Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 start                        # Start without project"
    echo "  $0 start /path/to/project       # Start with project"
    echo "  $0 dev /path/to/project         # Start in foreground with project"
    echo ""
    echo "Environment Variables:"
    echo "  SDD_PROJECT_PATH  - Project path (alternative to command line argument)"
}

# メイン処理
case "${1:-help}" in
    start)
        start "$2"
        ;;
    stop)
        stop
        ;;
    restart)
        restart "$2"
        ;;
    status)
        status
        ;;
    logs)
        logs
        ;;
    dev)
        dev "$2"
        ;;
    help|--help|-h)
        help
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        help
        exit 1
        ;;
esac
