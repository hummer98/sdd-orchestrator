#!/bin/bash

# E2E Result Parser Script
# WebdriverIO出力から成功/失敗情報を抽出し、構造化出力を生成する
#
# Usage:
#   cat wdio-output.log | ./scripts/parse-e2e-result.sh
#   ./scripts/parse-e2e-result.sh < wdio-output.log
#
# Input: WebdriverIOのテスト出力（標準入力）
# Output:
#   成功時: E2E PASSED (N tests)
#   失敗時: E2E FAILED (M passed, N failed) + 失敗テスト詳細

set -e

# カラー出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 一時ファイルに入力を保存
TEMP_FILE=$(mktemp)
cat > "$TEMP_FILE"

# クリーンアップ
cleanup() {
    rm -f "$TEMP_FILE"
}
trap cleanup EXIT

# WebdriverIOの出力から結果行を抽出
# 例: "Spec Files:     13 passed, 0 failed, 13 total"
#     "Spec Files:     12 passed, 1 failed, 13 total"
extract_summary() {
    # 新しいフォーマット: "N specs passed, M failed"
    local result_line
    result_line=$(grep -E "[0-9]+ specs? (passed|failed)" "$TEMP_FILE" 2>/dev/null | tail -1 || true)

    if [ -n "$result_line" ]; then
        echo "$result_line"
        return
    fi

    # 旧フォーマット: "Spec Files: X passed, Y failed, Z total"
    result_line=$(grep -E "Spec Files.*passed.*failed" "$TEMP_FILE" 2>/dev/null | tail -1 || true)

    if [ -n "$result_line" ]; then
        echo "$result_line"
        return
    fi

    # テスト数のみ: "X passing" or "X passing, Y failing"
    result_line=$(grep -E "([0-9]+) passing" "$TEMP_FILE" 2>/dev/null | tail -1 || true)

    if [ -n "$result_line" ]; then
        echo "$result_line"
        return
    fi

    echo ""
}

# 成功/失敗のテスト数を抽出
parse_counts() {
    local summary="$1"
    local passed=0
    local failed=0

    # "N specs passed, M failed" パターン
    if echo "$summary" | grep -qE "([0-9]+) specs? passed"; then
        passed=$(echo "$summary" | grep -oE "([0-9]+) specs? passed" | grep -oE "^[0-9]+")
    fi

    if echo "$summary" | grep -qE "([0-9]+) failed"; then
        failed=$(echo "$summary" | grep -oE "([0-9]+) failed" | grep -oE "^[0-9]+")
    fi

    # "Spec Files: X passed, Y failed" パターン
    if [ "$passed" -eq 0 ] && echo "$summary" | grep -qE "([0-9]+) passed"; then
        passed=$(echo "$summary" | grep -oE "([0-9]+) passed" | grep -oE "^[0-9]+")
    fi

    # "X passing" パターン
    if [ "$passed" -eq 0 ] && echo "$summary" | grep -qE "([0-9]+) passing"; then
        passed=$(echo "$summary" | grep -oE "([0-9]+) passing" | grep -oE "^[0-9]+")
    fi

    # "Y failing" パターン
    if [ "$failed" -eq 0 ] && echo "$summary" | grep -qE "([0-9]+) failing"; then
        failed=$(echo "$summary" | grep -oE "([0-9]+) failing" | grep -oE "^[0-9]+")
    fi

    echo "$passed $failed"
}

# 失敗テストの詳細を抽出
extract_failures() {
    # AssertionError や Error のパターンを探す
    # 例:
    # 1) TestSuite "test name"
    #    AssertionError: expected true to be false
    #      at Context.<anonymous> (file.spec.ts:123:45)

    local in_failure=false
    local current_test=""
    local current_file=""
    local current_error=""

    # WebdriverIOの失敗パターン
    # "✖ should do something" または "1) test name" で始まる失敗
    while IFS= read -r line; do
        # 失敗テストの開始（Mocha形式）
        if echo "$line" | grep -qE "^[[:space:]]*[0-9]+\)"; then
            if [ "$in_failure" = true ] && [ -n "$current_test" ]; then
                output_failure
            fi
            in_failure=true
            current_test=$(echo "$line" | sed 's/^[[:space:]]*[0-9]*)[[:space:]]*//')
            current_file=""
            current_error=""
            continue
        fi

        # 失敗テストの開始（チェックマーク形式）
        if echo "$line" | grep -qE "^[[:space:]]*(✖|×|✗)"; then
            if [ "$in_failure" = true ] && [ -n "$current_test" ]; then
                output_failure
            fi
            in_failure=true
            current_test=$(echo "$line" | sed 's/^[[:space:]]*(✖|×|✗)[[:space:]]*//')
            current_file=""
            current_error=""
            continue
        fi

        # 失敗中の場合
        if [ "$in_failure" = true ]; then
            # エラーメッセージ
            if echo "$line" | grep -qE "(AssertionError|Error|TypeError|ReferenceError):"; then
                current_error=$(echo "$line" | sed 's/^[[:space:]]*//')
            fi

            # ファイル位置
            if echo "$line" | grep -qE "at.*\.(spec|test)\.(ts|js):[0-9]+"; then
                # 例: "at Context.<anonymous> (file.spec.ts:123:45)" -> "file.spec.ts:123"
                current_file=$(echo "$line" | grep -oE "[a-zA-Z0-9_-]+\.(spec|test)\.(ts|js):[0-9]+" | head -1)
            fi

            # 次のテストケースや空行で区切り
            if echo "$line" | grep -qE "^[[:space:]]*$" && [ -n "$current_error" ]; then
                output_failure
                in_failure=false
                current_test=""
                current_file=""
                current_error=""
            fi
        fi
    done < "$TEMP_FILE"

    # 最後の失敗テスト
    if [ "$in_failure" = true ] && [ -n "$current_test" ]; then
        output_failure
    fi
}

# 失敗テスト情報を出力
output_failure() {
    if [ -n "$current_file" ]; then
        echo "- ${current_file} \"${current_test}\""
    else
        echo "- \"${current_test}\""
    fi
    if [ -n "$current_error" ]; then
        echo "    Error: ${current_error}"
    fi
}

# メイン処理
main() {
    # サマリー行を抽出
    local summary
    summary=$(extract_summary)

    if [ -z "$summary" ]; then
        # サマリーが見つからない場合、入力全体を出力してエラー終了
        echo -e "${RED}E2E RESULT UNKNOWN${NC}"
        echo ""
        echo "Could not parse WebdriverIO output."
        echo "Raw output:"
        echo "---"
        head -100 "$TEMP_FILE"
        echo "---"
        exit 1
    fi

    # テスト数を抽出
    local counts
    counts=$(parse_counts "$summary")
    local passed
    local failed
    passed=$(echo "$counts" | cut -d' ' -f1)
    failed=$(echo "$counts" | cut -d' ' -f2)

    # 結果出力
    if [ "$failed" -eq 0 ]; then
        # 全テスト成功
        local total=$((passed + failed))
        echo -e "${GREEN}E2E PASSED${NC} ($total tests)"
        exit 0
    else
        # 失敗あり
        echo -e "${RED}E2E FAILED${NC} ($passed passed, $failed failed)"
        echo ""
        echo "Failed tests:"
        extract_failures
        exit 1
    fi
}

main "$@"
