#!/bin/bash
# git-daily-stats.sh - 日毎のコミット数と行数増減を集計
#
# Usage: git-daily-stats.sh [--since DATE]
#   DATE: 集計開始日 (default: 2026-01-01)
#
# Example:
#   git-daily-stats.sh
#   git-daily-stats.sh --since 2026-02-01

set -euo pipefail

SINCE_DATE="2026-01-01"

while [[ $# -gt 0 ]]; do
  case $1 in
    --since)
      SINCE_DATE="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $(basename "$0") [--since DATE]"
      echo "  DATE: 集計開始日 (default: 2026-01-01)"
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

# 開始日から今日までの全日付を生成
generate_all_dates() {
  local start="$1"
  local end
  end=$(date +%Y-%m-%d)
  local current="$start"

  while [[ ! "$current" > "$end" ]]; do
    echo "$current"
    current=$(date -j -v+1d -f "%Y-%m-%d" "$current" +%Y-%m-%d)
  done
}

# gitログからコミット統計を取得
git_stats=$(git log --since="$SINCE_DATE" --format="%ad" --date=short --numstat | awk '
/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/ { date = $0; commits[date]++ }
/^[0-9]+\t[0-9]+\t/ { added[date] += $1; deleted[date] += $2 }
END {
  for (d in commits) {
    delta = added[d] - deleted[d]
    printf "%s\t%d\t%d\t%d\t%d\n", d, commits[d], added[d], deleted[d], delta
  }
}')

# 全日付とマージして出力
{
  generate_all_dates "$SINCE_DATE"
  echo "$git_stats"
} | awk '
NF == 1 { all_dates[$1] = 1 }
NF == 5 { commits[$1] = $2; added[$1] = $3; deleted[$1] = $4; delta[$1] = $5 }
END {
  print "日付\t\tコミット数\t追加行\t\t削除行\t\t増減"
  print "--------------------------------------------------------------------"

  n = 0
  for (d in all_dates) { dates[n++] = d }
  # ソート
  for (i = 0; i < n-1; i++) {
    for (j = i+1; j < n; j++) {
      if (dates[i] > dates[j]) {
        tmp = dates[i]; dates[i] = dates[j]; dates[j] = tmp
      }
    }
  }

  total_commits = 0; total_added = 0; total_deleted = 0; total_delta = 0
  for (i = 0; i < n; i++) {
    d = dates[i]
    c = commits[d] + 0
    a = added[d] + 0
    del = deleted[d] + 0
    dlt = delta[d] + 0
    printf "%s\t%d\t\t%d\t\t%d\t\t%+d\n", d, c, a, del, dlt
    total_commits += c
    total_added += a
    total_deleted += del
    total_delta += dlt
  }

  print "--------------------------------------------------------------------"
  printf "合計\t\t%d\t\t%d\t\t%d\t\t%+d\n", total_commits, total_added, total_deleted, total_delta
  if (n > 0) {
    printf "平均/日\t\t%.1f\t\t%.0f\t\t%.0f\t\t%+.0f\n", total_commits/n, total_added/n, total_deleted/n, total_delta/n
  }
}'
