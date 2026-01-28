# Research & Design Decisions: Worktree Rebase from Main

## Summary

- **Feature**: worktree-rebase-from-main
- **Discovery Scope**: Extension（既存Worktree機能の拡張）
- **Key Findings**:
  - 既存 `merge-spec.sh` パターンがrebase操作にも適用可能
  - IPC+WebSocketの二重対応パターンが確立済み
  - Worktree UI（SpecWorkflowFooter/BugWorkflowFooter）の拡張ポイントが明確
  - jj/gitコマンド実行の安定性検証が既存実装で実証済み

## Research Log

### 既存Worktree Infrastructure調査

**Context**: Worktree機能の既存実装を理解し、rebase機能の統合方式を決定するため

**Sources Consulted**:
- `electron-sdd-manager/src/main/services/worktreeService.ts` — Worktree操作の抽象化層
- `electron-sdd-manager/src/main/services/convertWorktreeService.ts` — 通常モード→Worktreeモード変換
- `electron-sdd-manager/src/shared/components/workflow/SpecWorkflowFooter.tsx` — Worktree操作ボタンUI
- `electron-sdd-manager/resources/templates/scripts/merge-spec.sh` — 既存merge-specスクリプトパターン

**Findings**:
- Worktreeの作成・削除・状態管理は `worktreeService` が集約
- `spec.json` / `bug.json` の `worktree` フィールドで状態永続化
- `hasWorktreePath()` / `isImplStarted()` 判定ロジックが既に実装済み
- UI層は `SpecWorkflowFooter` で「Worktreeに変更」ボタンを条件付き表示
- スクリプト実行は `child_process.spawn` でエラーハンドリング実装済み

**Implications**:
- rebase機能も同じworktreeServiceに追加することで一貫性を保つ
- UI表示条件は既存パターン（`hasWorktreePath()` 判定）を再利用
- スクリプト終了コードによる結果判定は既存merge-spec.shと同一パターンを踏襲

### merge-spec.shパターン分析

**Context**: 新規 `rebase-worktree.sh` スクリプトの設計指針を決定するため

**Sources Consulted**:
- `electron-sdd-manager/resources/templates/scripts/merge-spec.sh` — 既存mergeスクリプト

**Findings**:
- **jq必須チェック**: スクリプト冒頭で `command -v jq` チェック、不在時は exit 2
- **spec.json読み取り**: `jq -r '.worktree.branch'` でブランチ名取得
- **jj優先・gitフォールバック**: `command -v jj` で判定、jj利用可能時は `jj squash` 実行、不在時は `git merge --squash`
- **終了コード分離**:
  - 0: 成功（マージ完了、worktree削除、ブランチ削除）
  - 1: コンフリクト発生
  - 2: エラー（jq不在、spec.json不在、引数不足）
- **Cleanup処理**: 成功時にworktree削除・ブランチ削除を自動実行

**Implications**:
- rebase-worktree.shもjq必須チェックを実装
- jj優先・gitフォールバックロジックを踏襲
- 終了コード分離を同一パターンで実装
- ただしrebaseは「mainの変更を取り込む」だけなので、worktree削除・ブランチ削除は**実行しない**（merge-spec.shとの相違点）

### IPC Architecture調査

**Context**: Remote UI対応含めたIPC設計を決定するため

**Sources Consulted**:
- `electron-sdd-manager/src/main/ipc/channels.ts` — IPCチャンネル定義
- `electron-sdd-manager/src/main/ipc/handlers.ts` — Electronハンドラ実装
- `electron-sdd-manager/src/main/services/webSocketHandler.ts` — Remote UI WebSocketハンドラ
- `electron-sdd-manager/src/preload/index.ts` — preload API公開

**Findings**:
- IPCチャンネル名は `channels.ts` で集中管理（例: `REBASE_FROM_MAIN`）
- `handlers.ts` でメインプロセスのハンドラ実装（`ipcMain.handle(...)`）
- preloadで `contextBridge.exposeInMainWorld` 経由でrendererに公開
- Remote UIは `webSocketHandler.ts` でWebSocketメッセージをIPC Handlerに転送
- エラーハンドリングは `Result<T, E>` 型でtry-catch統一

**Implications**:
- 新規チャンネル `worktree:rebase-from-main` を追加
- IPC HandlerがworktreeServiceを呼び出す形で実装
- WebSocket Handlerは既存パターンに従いIPC Handlerに転送
- ApiClient抽象化層（IpcApiClient/WebSocketApiClient）に `rebaseFromMain()` メソッド追加

### AI Conflict Resolution調査

**Context**: コンフリクト自動解決の実装方式を決定するため

**Sources Consulted**:
- Requirements Decision Log（requirements.md）— 「AI自動解決（最大7回試行）」合意事項
- 既存spec-merge実装参照（コード内のコンフリクト解決ロジック）

**Findings**:
- spec-mergeでは既にAI自動解決フローが実装済み（最大7回リトライ）
- コンフリクトマーカー検出 → AI解決試行 → `git add` → `git rebase --continue` のフローが確立
- 7回失敗時は `git rebase --abort` で状態復元

**Implications**:
- rebase-worktree.shではコンフリクト検知（exit 1）のみ実施
- AI解決フローはworktreeServiceの `resolveConflictWithAI()` メソッドとして実装
- jjの場合は `jj undo` で状態復元

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Script分離 | rebase-worktree.shにGit操作を分離 | 既存merge-spec.shと一貫性、シェルスクリプトはGit操作に適している | スクリプトテスト環境が必要 | **採用**: 既存パターンとの整合性重視 |
| Node.js直接実行 | worktreeServiceから直接git/jjコマンド実行 | スクリプト配置不要 | エラーハンドリング複雑化、既存パターンとの乖離 | 却下 |
| IPC+WebSocket二重対応 | Electron IPCとWebSocketで同一処理 | Desktop/Remote UIで統一UX | WebSocketハンドラの追加実装が必要 | **採用**: 既存Remote UI実装パターン踏襲 |
| Remote UI専用実装 | Remote UIは別ロジック | 各環境に最適化可能 | コード重複、不整合リスク | 却下 |

## Design Decisions

### Decision: スクリプトからworktree削除を除外

**Context**: merge-spec.shは成功時にworktree削除・ブランチ削除を実行するが、rebase-worktree.shでも同様の処理を実装すべきか

**Alternatives Considered**:
1. merge-spec.shと同じくworktree削除を実行 — rebase完了後にworktreeを削除
2. worktree削除を実行しない — rebaseは「mainを取り込む」のみで、実装作業は継続

**Selected Approach**: worktree削除を実行しない（Option 2）

**Rationale (Why)**:
- **技術的理由**: rebaseは実装作業の途中でmainの変更を取り込む操作であり、worktreeでの作業は継続する
- **ユーザー体験**: rebase後も同じworktreeで実装を続けることが期待される動作
- **merge-specとの違い**: merge-specは「実装完了後にmainにマージ」であり、worktree削除が妥当。rebaseは「実装継続中にmainを取り込み」であり、削除は不適切

**Trade-offs**:
- **Benefit**: ユーザーはrebase後も同じ環境で作業継続可能
- **Compromise**: merge-spec.shとの処理フローの違いが生じる（ただし目的が異なるため妥当）

**Follow-up**: なし

### Decision: 「mainを取り込み」ボタンの配置

**Context**: UIボタンをどこに配置するか

**Alternatives Considered**:
1. SpecWorkflowFooterに配置 — 「Worktreeに変更」ボタンと同じエリア
2. ヘッダーに配置 — 上部固定で常時表示
3. 右サイドバーに配置 — Worktree操作エリアとして独立

**Selected Approach**: SpecWorkflowFooter/BugWorkflowFooterに配置（Option 1）

**Rationale (Why)**:
- **技術的理由**: 既存「Worktreeに変更」ボタンと同じコンポーネント内で条件分岐により表示切り替え可能
- **ユーザー体験**: Worktree関連操作を同じ場所に集約し、操作の文脈を明確化
- **一貫性**: 既存UIパターンとの整合性を維持

**Trade-offs**:
- **Benefit**: コンポーネント拡張のみで実装可能、UIの一貫性維持
- **Compromise**: Footerエリアにボタンが増えることでレイアウト調整が必要

**Follow-up**: モバイルUIでのボタン配置検証（Safe Areaを考慮）

### Decision: rebase処理中の状態管理

**Context**: rebase処理中の状態をどこで管理するか

**Alternatives Considered**:
1. spec.jsonに `rebasing: boolean` フィールド追加 — 永続化
2. specStore/bugStoreに `isRebasing: boolean` 状態追加 — 一時的

**Selected Approach**: specStore/bugStoreに状態追加（Option 2）

**Rationale (Why)**:
- **技術的理由**: rebase処理は一時的なアクションであり、ファイル永続化不要
- **一貫性**: 既存の自動実行状態管理（`isAutoExecuting`）と同一パターン
- **保守性**: spec.jsonへの不要なフィールド追加を避ける

**Trade-offs**:
- **Benefit**: シンプルな状態管理、spec.jsonのスキーマ肥大化を防ぐ
- **Compromise**: アプリ再起動時に状態が失われる（ただしrebase処理は数秒で完了するため影響なし）

**Follow-up**: なし

## Risks & Mitigations

**Risk 1**: jq未インストール環境でのエラー多発
- **Mitigation**: スクリプト冒頭でjq存在チェック、エラーメッセージで「brew install jq」ガイド表示

**Risk 2**: AI解決が7回失敗する複雑なコンフリクト
- **Mitigation**: エラーメッセージで「手動解決してください」ガイド、git rebase --abortで状態復元

**Risk 3**: Remote UIでのWebSocket接続断によるrebase中断
- **Mitigation**: IPC Handlerでrebase処理が完了するまで待機、再接続時に結果通知

**Risk 4**: mainブランチ名が"master"でない環境（"main"等）
- **Mitigation**: スクリプトで `git symbolic-ref refs/remotes/origin/HEAD` から自動検出

## References

- [Git Worktree Documentation](https://git-scm.com/docs/git-worktree) — Git Worktree公式ドキュメント
- [Jujutsu (jj) Documentation](https://github.com/martinvonz/jj) — jj VCS公式リポジトリ
- [Electron IPC Tutorial](https://www.electronjs.org/docs/latest/tutorial/ipc) — Electron IPC通信パターン
- 既存実装: `merge-spec.sh`, `worktreeService.ts`, `SpecWorkflowFooter.tsx`
