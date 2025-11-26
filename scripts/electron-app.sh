#!/bin/bash

# Electron App Control Script
# 多重起動を防止しつつ、起動・停止・再起動を制御するスクリプト

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
start() {
    echo -e "${GREEN}Starting Electron app...${NC}"

    if is_running; then
        local pid=$(cat "$PID_FILE")
        echo -e "${YELLOW}App is already running (PID: $pid)${NC}"
        echo -e "Use '${YELLOW}task electron:restart${NC}' to restart"
        exit 1
    fi

    # 既存のプロセスがないか確認
    local existing_pid=$(find_dev_process)
    if [ -n "$existing_pid" ]; then
        echo -e "${YELLOW}Found existing process (PID: $existing_pid). Stopping it first...${NC}"
        kill "$existing_pid" 2>/dev/null || true
        sleep 2
    fi

    cd "$ELECTRON_DIR"

    # バックグラウンドで起動
    nohup npm run dev > "$LOG_FILE" 2>&1 &
    local pid=$!
    echo "$pid" > "$PID_FILE"

    echo -e "${GREEN}App started (PID: $pid)${NC}"
    echo -e "Log file: $LOG_FILE"
    echo -e "Use '${YELLOW}task electron:logs${NC}' to view logs"
    echo -e "Use '${YELLOW}task electron:stop${NC}' to stop"
}

# 停止
stop() {
    echo -e "${YELLOW}Stopping Electron app...${NC}"

    if is_running; then
        local pid=$(cat "$PID_FILE")
        echo "Stopping process (PID: $pid)..."

        # まずSIGTERMで優雅に停止を試みる
        kill "$pid" 2>/dev/null || true

        # 最大5秒待機
        local count=0
        while [ $count -lt 5 ]; do
            if ! ps -p "$pid" > /dev/null 2>&1; then
                break
            fi
            sleep 1
            count=$((count + 1))
        done

        # まだ実行中ならSIGKILL
        if ps -p "$pid" > /dev/null 2>&1; then
            echo "Force killing process..."
            kill -9 "$pid" 2>/dev/null || true
        fi

        rm -f "$PID_FILE"
        echo -e "${GREEN}App stopped${NC}"
    else
        echo -e "${YELLOW}App is not running${NC}"
    fi

    # 残存プロセスのクリーンアップ
    local remaining=$(find_dev_process)
    if [ -n "$remaining" ]; then
        echo "Cleaning up remaining processes..."
        echo "$remaining" | xargs -r kill 2>/dev/null || true
        sleep 1
        echo "$remaining" | xargs -r kill -9 2>/dev/null || true
    fi
}

# 再起動
restart() {
    echo -e "${YELLOW}Restarting Electron app...${NC}"
    stop
    sleep 2
    start
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
dev() {
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

    cd "$ELECTRON_DIR"
    npm run dev
}

# ヘルプ表示
help() {
    echo "Electron App Control Script"
    echo ""
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  start    - Start the app in background"
    echo "  stop     - Stop the running app"
    echo "  restart  - Restart the app"
    echo "  status   - Show app status"
    echo "  logs     - Show and follow logs"
    echo "  dev      - Start in foreground (interactive)"
    echo "  help     - Show this help"
}

# メイン処理
case "${1:-help}" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    status)
        status
        ;;
    logs)
        logs
        ;;
    dev)
        dev
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
