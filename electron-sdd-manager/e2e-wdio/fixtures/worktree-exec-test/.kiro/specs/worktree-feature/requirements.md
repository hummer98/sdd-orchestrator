# Requirements Document

## Project Description (Input)
worktree実行ワークフローのテスト用機能。worktreeモードと通常モードの両方をサポートする。

## Requirements

### REQ-001: Worktreeモード実装
- worktreeモードでの実装実行をサポートする
- worktree作成、実装、マージのフローを完結させる

### REQ-002: 通常モード実装
- 通常モード（カレントブランチ）での実装実行をサポートする
- deployフェーズでコミット処理を行う

### REQ-003: モード切替
- 実装開始前にモード選択が可能
- 実装開始後はモード変更をロック

## Approval Status
- Generated: Yes
- Approved: Yes
