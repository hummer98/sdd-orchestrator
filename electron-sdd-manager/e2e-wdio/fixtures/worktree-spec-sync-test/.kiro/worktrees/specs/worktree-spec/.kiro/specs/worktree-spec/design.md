# Design Document

## Overview
Worktree Specの設計ドキュメント。

## Architecture
Worktree内での分離された開発環境を提供。

### Worktree Structure
- Worktreeは `.kiro/worktrees/specs/{specId}/` に配置
- 各Worktreeは独自の `.kiro/specs/{specId}/` を持つ
- ログとランタイムはシンボリックリンクでメインリポジトリを共有

## Approval Status
- Generated: Yes
- Approved: Yes
