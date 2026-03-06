#!/bin/bash
# gh-issue.sh
# GitHub Issue操作スクリプト: gh CLIを使用したサブコマンド形式
# Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
#
# Usage: gh-issue.sh <subcommand> [args...]
#   read <number>                          - Issue本文+コメントをMarkdown形式で出力
#   comment <number> <body>                - コメント投稿
#   label <number> <action> <label>        - Label追加(add)/削除(remove)
#   list [--state open|closed] [--label <label>...]  - Issue一覧取得
#   create <title> <body>                  - Issue作成
#
# Environment Variables:
#   GITHUB_TOKEN  - PAT (優先)。未設定時は gh auth status でフォールバック
#   GH_HOST       - GitHub Enterprise ホスト名 (例: github.example.com)
#
# Exit codes:
#   0 - Success
#   1 - Error (missing argument, gh CLI not found, API error)

set -euo pipefail

# ─── Color Output ───────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# ─── Helper Functions ───────────────────────────────────────

error() {
  echo -e "${RED}Error: $1${NC}" >&2
  exit 1
}

warn() {
  echo -e "${YELLOW}Warning: $1${NC}" >&2
}

info() {
  echo -e "${CYAN}$1${NC}" >&2
}

usage() {
  cat <<'USAGE'
Usage: gh-issue.sh <subcommand> [args...]

Subcommands:
  read <number>                                  Read issue body + comments (Markdown)
  comment <number> <body>                        Post a comment
  label <number> <add|remove> <label>            Add or remove a label
  list [--state open|closed] [--label <l>...]    List issues
  create <title> <body>                          Create a new issue

Environment:
  GITHUB_TOKEN   GitHub PAT (preferred). Falls back to gh auth.
  GH_HOST        GitHub Enterprise host (e.g. github.example.com)
USAGE
  exit 1
}

# ─── Prerequisites ──────────────────────────────────────────

check_gh_cli() {
  if ! command -v gh &>/dev/null; then
    error "gh CLI is not installed.
Install it from https://cli.github.com/
  macOS:   brew install gh
  Linux:   See https://github.com/cli/cli/blob/trunk/docs/install_linux.md
  Windows: winget install --id GitHub.cli"
  fi
}

# ─── Authentication ─────────────────────────────────────────

setup_auth() {
  if [ -n "${GITHUB_TOKEN:-}" ]; then
    export GH_TOKEN="$GITHUB_TOKEN"
    return
  fi

  # フォールバック: gh auth status で認証状態を確認
  if ! gh auth status &>/dev/null; then
    error "Not authenticated. Set GITHUB_TOKEN environment variable or run 'gh auth login'."
  fi
}

# ─── Repository Detection ──────────────────────────────────

detect_repo() {
  local remote_url
  remote_url=$(git remote get-url origin 2>/dev/null) || \
    error "Failed to detect repository. Ensure you are in a git repository with an 'origin' remote."

  # Parse owner/repo from various URL formats:
  #   https://github.com/owner/repo.git
  #   https://github.com/owner/repo
  #   git@github.com:owner/repo.git
  #   ssh://git@github.com/owner/repo.git
  #   https://github.example.com/owner/repo.git
  REPO_OWNER_REPO=$(echo "$remote_url" | sed -E 's#^(https?://[^/]+/|git@[^:]+:|ssh://[^/]+/)##; s/\.git$//')

  if [ -z "$REPO_OWNER_REPO" ] || ! echo "$REPO_OWNER_REPO" | grep -q '/'; then
    error "Failed to parse owner/repo from remote URL: $remote_url"
  fi

  REPO_OWNER="${REPO_OWNER_REPO%%/*}"
  REPO_NAME="${REPO_OWNER_REPO#*/}"
}

# ─── GH CLI wrapper (handles GH_HOST for Enterprise) ───────

gh_api() {
  local endpoint="$1"
  shift
  if [ -n "${GH_HOST:-}" ]; then
    gh api --hostname "$GH_HOST" "$endpoint" "$@"
  else
    gh api "$endpoint" "$@"
  fi
}

# ─── Subcommand: read ──────────────────────────────────────

cmd_read() {
  local number="${1:-}"
  [ -z "$number" ] && error "Usage: gh-issue.sh read <number>"

  detect_repo

  # Issue本文を取得
  local issue_json
  issue_json=$(gh_api "/repos/${REPO_OWNER}/${REPO_NAME}/issues/${number}" \
    --jq '{title: .title, body: .body, state: .state, user: .user.login, labels: [.labels[].name], assignees: [.assignees[].login], created_at: .created_at, updated_at: .updated_at}')

  local title body state user labels assignees created_at
  title=$(echo "$issue_json" | jq -r '.title')
  body=$(echo "$issue_json" | jq -r '.body // ""')
  state=$(echo "$issue_json" | jq -r '.state')
  user=$(echo "$issue_json" | jq -r '.user')
  labels=$(echo "$issue_json" | jq -r '.labels | join(", ")')
  assignees=$(echo "$issue_json" | jq -r '.assignees | join(", ")')
  created_at=$(echo "$issue_json" | jq -r '.created_at')

  # Markdown形式で出力
  echo "# #${number}: ${title}"
  echo ""
  echo "- **State**: ${state}"
  echo "- **Author**: @${user}"
  [ -n "$labels" ] && echo "- **Labels**: ${labels}"
  [ -n "$assignees" ] && echo "- **Assignees**: ${assignees}"
  echo "- **Created**: ${created_at}"
  echo ""
  echo "## Description"
  echo ""
  if [ -n "$body" ]; then
    echo "$body"
  else
    echo "_No description provided._"
  fi

  # コメント取得
  local comments_json
  comments_json=$(gh_api "/repos/${REPO_OWNER}/${REPO_NAME}/issues/${number}/comments" \
    --jq '[.[] | {user: .user.login, body: .body, created_at: .created_at}]')

  local comment_count
  comment_count=$(echo "$comments_json" | jq 'length')

  if [ "$comment_count" -gt 0 ]; then
    echo ""
    echo "## Comments (${comment_count})"
    echo ""
    echo "$comments_json" | jq -r '.[] | "### @\(.user) (\(.created_at))\n\n\(.body)\n\n---\n"'
  fi
}

# ─── Subcommand: comment ───────────────────────────────────

cmd_comment() {
  local number="${1:-}"
  local body="${2:-}"
  [ -z "$number" ] && error "Usage: gh-issue.sh comment <number> <body>"
  [ -z "$body" ] && error "Usage: gh-issue.sh comment <number> <body>"

  detect_repo

  gh_api "/repos/${REPO_OWNER}/${REPO_NAME}/issues/${number}/comments" \
    -X POST \
    -f body="$body" \
    --jq '"\(.html_url)"' || error "Failed to post comment to issue #${number}"

  info "Comment posted to issue #${number}"
}

# ─── Subcommand: label ─────────────────────────────────────

cmd_label() {
  local number="${1:-}"
  local action="${2:-}"
  local label="${3:-}"
  [ -z "$number" ] && error "Usage: gh-issue.sh label <number> <add|remove> <label>"
  [ -z "$action" ] && error "Usage: gh-issue.sh label <number> <add|remove> <label>"
  [ -z "$label" ] && error "Usage: gh-issue.sh label <number> <add|remove> <label>"

  detect_repo

  case "$action" in
    add)
      gh_api "/repos/${REPO_OWNER}/${REPO_NAME}/issues/${number}/labels" \
        -X POST \
        --input <(jq -n --arg l "$label" '{"labels":[$l]}') \
        --jq '[.[].name] | join(", ")' || error "Failed to add label '${label}' to issue #${number}"
      info "Label '${label}' added to issue #${number}"
      ;;
    remove)
      # URL-encode the label name (handles colons and spaces)
      local encoded_label
      encoded_label=$(printf '%s' "$label" | jq -sRr @uri)
      gh_api "/repos/${REPO_OWNER}/${REPO_NAME}/issues/${number}/labels/${encoded_label}" \
        -X DELETE || error "Failed to remove label '${label}' from issue #${number}"
      info "Label '${label}' removed from issue #${number}"
      ;;
    set)
      # status: Label のアトミック更新: 旧status:* を削除して新statusを設定
      # まず現在のLabelを取得
      local current_labels
      current_labels=$(gh_api "/repos/${REPO_OWNER}/${REPO_NAME}/issues/${number}/labels" \
        --jq '[.[].name]')

      # status: 以外のLabelを保持 + 新しいLabelを追加
      local new_labels
      new_labels=$(echo "$current_labels" | jq --arg new "$label" '[.[] | select(startswith("status:") | not)] + [$new]')

      gh_api "/repos/${REPO_OWNER}/${REPO_NAME}/issues/${number}/labels" \
        -X PUT \
        --input <(echo "$new_labels" | jq '{labels: .}') \
        --jq '[.[].name] | join(", ")' || error "Failed to set label '${label}' on issue #${number}"
      info "Label set to '${label}' on issue #${number} (previous status:* labels removed)"
      ;;
    *)
      error "Unknown label action: '${action}'. Use 'add', 'remove', or 'set'."
      ;;
  esac
}

# ─── Subcommand: list ──────────────────────────────────────

cmd_list() {
  detect_repo

  local state="open"
  local labels=()
  local extra_args=()

  while [ $# -gt 0 ]; do
    case "$1" in
      --state)
        state="${2:-open}"
        shift 2
        ;;
      --label)
        labels+=("$2")
        shift 2
        ;;
      *)
        warn "Unknown option: $1"
        shift
        ;;
    esac
  done

  # Build query parameters
  extra_args+=(-f "state=${state}")
  if [ ${#labels[@]} -gt 0 ]; then
    local labels_csv
    labels_csv=$(IFS=,; echo "${labels[*]}")
    extra_args+=(-f "labels=${labels_csv}")
  fi
  extra_args+=(-f "per_page=30")

  # Issue一覧取得（PRを除外: pull_requestフィールドがないもの）
  local issues_json
  issues_json=$(gh_api "/repos/${REPO_OWNER}/${REPO_NAME}/issues" \
    "${extra_args[@]}" \
    --jq '[.[] | select(.pull_request == null) | {number, title, state, user: .user.login, labels: [.labels[].name], assignees: [.assignees[].login], created_at: .created_at, comments}]')

  local count
  count=$(echo "$issues_json" | jq 'length')

  if [ "$count" -eq 0 ]; then
    echo "No issues found (state: ${state})."
    return
  fi

  echo "# Issues (${count}, state: ${state})"
  echo ""
  echo "$issues_json" | jq -r '.[] |
    "- **#\(.number)** \(.title)\n  State: \(.state) | Author: @\(.user) | Labels: \(.labels | join(", ")) | Comments: \(.comments)\n"'
}

# ─── Subcommand: create ────────────────────────────────────

cmd_create() {
  local title="${1:-}"
  local body="${2:-}"
  [ -z "$title" ] && error "Usage: gh-issue.sh create <title> <body>"
  [ -z "$body" ] && error "Usage: gh-issue.sh create <title> <body>"

  detect_repo

  local result
  result=$(gh_api "/repos/${REPO_OWNER}/${REPO_NAME}/issues" \
    -X POST \
    -f title="$title" \
    -f body="$body" \
    --jq '{number: .number, html_url: .html_url, title: .title}') || error "Failed to create issue"

  local number html_url
  number=$(echo "$result" | jq -r '.number')
  html_url=$(echo "$result" | jq -r '.html_url')

  echo "Issue #${number} created: ${html_url}"
}

# ─── Main ───────────────────────────────────────────────────

main() {
  check_gh_cli

  local subcommand="${1:-}"
  [ -z "$subcommand" ] && usage
  shift

  setup_auth

  case "$subcommand" in
    read)    cmd_read "$@" ;;
    comment) cmd_comment "$@" ;;
    label)   cmd_label "$@" ;;
    list)    cmd_list "$@" ;;
    create)  cmd_create "$@" ;;
    help|-h|--help) usage ;;
    *)       error "Unknown subcommand: '${subcommand}'. Run 'gh-issue.sh help' for usage." ;;
  esac
}

main "$@"
