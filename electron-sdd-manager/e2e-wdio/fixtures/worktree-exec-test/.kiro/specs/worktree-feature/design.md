# Design Document

## Overview
worktree実行ワークフローのテスト用設計。

## Architecture

### Worktreeモード
1. worktreeモードチェックボックスをON
2. impl実行時にworktree作成
3. worktree内で実装を進行
4. deploy時にspec-mergeでマージ

### 通常モード
1. worktreeモードチェックボックスをOFF
2. impl実行時にカレントブランチ情報を保存
3. カレントブランチで実装を進行
4. deploy時に/commitでコミット

## Components

### WorktreeModeCheckbox
- 状態：ON（worktreeモード）、OFF（通常モード）
- ロック条件：実装開始後（spec.json.worktree.branch存在）

### ImplFlowFrame
- impl、inspection、deployを囲む枠
- worktreeモード時は背景色変更

## Approval Status
- Generated: Yes
- Approved: Yes
