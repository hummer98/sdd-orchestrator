#!/bin/bash

# E2E Test Runner with Report Generation
# WebdriverIOテストを実行し、結果をマークダウンレポートとして出力する
#
# Usage:
#   ./scripts/run-e2e-report.sh [--spec <pattern>] [--no-build] [--report-dir <dir>]
#
# Options:
#   --spec <pattern>  特定のspecファイルのみ実行 (例: e2e-wdio/app-launch*)
#   --no-build        ビルドをスキップ
#   --report-dir <dir> レポート出力先 (デフォルト: docs/e2e-report)
#
# Output:
#   - 標準出力にサマリーテーブル
#   - docs/e2e-report/e2e-report-YYYY-MM-DD.md にレポート保存

set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_DIR="$PROJECT_ROOT/electron-sdd-manager"
REPORT_DIR="$PROJECT_ROOT/docs/e2e-report"
SKIP_BUILD=false
SPEC_PATTERN=""

# 引数解析
while [[ $# -gt 0 ]]; do
    case "$1" in
        --spec)
            SPEC_PATTERN="$2"
            shift 2
            ;;
        --no-build)
            SKIP_BUILD=true
            shift
            ;;
        --report-dir)
            REPORT_DIR="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1" >&2
            exit 1
            ;;
    esac
done

# レポートディレクトリ作成
mkdir -p "$REPORT_DIR"

DATE=$(date -u +"%Y-%m-%d")
REPORT_FILE="$REPORT_DIR/e2e-report-$DATE.md"
TEMP_OUTPUT=$(mktemp)

cleanup() {
    rm -f "$TEMP_OUTPUT"
}
trap cleanup EXIT

# ビルド
if [ "$SKIP_BUILD" = false ]; then
    echo "Building Electron app..."
    cd "$APP_DIR" && npm run build 2>&1 | tail -5
fi

# wdio実行
echo "Running E2E tests..."
cd "$APP_DIR"

WDIO_CMD="npx wdio run wdio.conf.ts"
if [ -n "$SPEC_PATTERN" ]; then
    WDIO_CMD="$WDIO_CMD --spec $SPEC_PATTERN"
fi

# テスト実行（失敗してもスクリプトは継続）
$WDIO_CMD 2>&1 | tee "$TEMP_OUTPUT"
WDIO_EXIT=$?

# 結果解析
echo ""
echo "=== E2E Result Summary ==="
echo ""

# specファイルごとの結果を抽出
# WebdriverIO v9 出力パターン:
#   ✓ (green) = passed spec
#   ✗ (red)   = failed spec
#   各行: "[wdio] PASSED in ..." or "[wdio] FAILED in ..."

PASSED_SPECS=()
FAILED_SPECS=()

# "PASSED" / "FAILED" パターンでspecファイルを抽出
while IFS= read -r line; do
    # パターン: 色制御なしで spec ファイルパスと PASSED/FAILED を取得
    spec_file=$(echo "$line" | grep -oE '[a-zA-Z0-9_.-]+\.e2e\.(spec|test)\.(ts|js)' | head -1)
    if [ -z "$spec_file" ]; then
        continue
    fi

    if echo "$line" | grep -q "PASSED\|passed"; then
        PASSED_SPECS+=("$spec_file")
    elif echo "$line" | grep -q "FAILED\|failed"; then
        FAILED_SPECS+=("$spec_file")
    fi
done < <(grep -E "(PASSED|FAILED|passed|failed)" "$TEMP_OUTPUT" | grep -E "\.e2e\.(spec|test)\.(ts|js)")

# フォールバック: "Spec Files:" サマリー行からカウント
if [ ${#PASSED_SPECS[@]} -eq 0 ] && [ ${#FAILED_SPECS[@]} -eq 0 ]; then
    SUMMARY_LINE=$(grep -E "specs? (passed|failed)|Spec Files" "$TEMP_OUTPUT" | tail -1)
    if [ -n "$SUMMARY_LINE" ]; then
        PASSED_COUNT=$(echo "$SUMMARY_LINE" | grep -oE '([0-9]+) (passed|specs? passed)' | grep -oE '^[0-9]+' || echo "0")
        FAILED_COUNT=$(echo "$SUMMARY_LINE" | grep -oE '([0-9]+) failed' | grep -oE '^[0-9]+' || echo "0")
    else
        PASSED_COUNT=0
        FAILED_COUNT=0
    fi
else
    PASSED_COUNT=${#PASSED_SPECS[@]}
    FAILED_COUNT=${#FAILED_SPECS[@]}
fi

TOTAL=$((PASSED_COUNT + FAILED_COUNT))
if [ "$TOTAL" -gt 0 ]; then
    RATE=$(( PASSED_COUNT * 100 / TOTAL ))
else
    RATE=0
fi

# コンソール出力（サマリー）
echo "| Metric     | Value |"
echo "|------------|-------|"
echo "| Passed     | $PASSED_COUNT |"
echo "| Failed     | $FAILED_COUNT |"
echo "| Total      | $TOTAL |"
echo "| Pass Rate  | ${RATE}% |"
echo ""

if [ ${#FAILED_SPECS[@]} -gt 0 ]; then
    echo "Failed specs:"
    for spec in "${FAILED_SPECS[@]}"; do
        echo "  - $spec"
    done
    echo ""
fi

# マークダウンレポート生成
{
    echo "# E2E Test Report - $DATE"
    echo ""
    echo "## Summary"
    echo ""
    echo "| Metric | Value |"
    echo "|--------|-------|"
    echo "| Passed | $PASSED_COUNT |"
    echo "| Failed | $FAILED_COUNT |"
    echo "| Total  | $TOTAL |"
    echo "| Pass Rate | ${RATE}% |"
    echo ""

    if [ ${#PASSED_SPECS[@]} -gt 0 ]; then
        echo "## Passed Specs"
        echo ""
        for spec in "${PASSED_SPECS[@]}"; do
            echo "- $spec"
        done
        echo ""
    fi

    if [ ${#FAILED_SPECS[@]} -gt 0 ]; then
        echo "## Failed Specs"
        echo ""
        for spec in "${FAILED_SPECS[@]}"; do
            echo "- $spec"
        done
        echo ""

        echo "## Failure Details"
        echo ""
        echo '```'
        # 失敗部分の詳細を抽出（エラーメッセージ周辺）
        grep -B2 -A5 "AssertionError\|Error:\|FAILED\|✗\|×" "$TEMP_OUTPUT" | head -200
        echo '```'
        echo ""
    fi

    echo "---"
    echo "Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
} > "$REPORT_FILE"

echo "Report saved: $REPORT_FILE"

exit $WDIO_EXIT
