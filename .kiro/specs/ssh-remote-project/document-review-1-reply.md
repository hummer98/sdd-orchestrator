# Response to Document Review #1

**Feature**: ssh-remote-project
**Review Date**: 2025-12-13
**Reply Date**: 2025-12-13

---

## Response Summary

| Severity | Issues | Fix Required | No Fix Needed | Needs Discussion |
| -------- | ------ | ------------ | ------------- | ---------------- |
| Critical | 2      | 2            | 0             | 0                |
| Warning  | 5      | 1            | 3             | 1                |
| Info     | 3      | 0            | 3             | 0                |

---

## Response to Critical Issues

### C1: タスク番号の不整合（7番台欠落）

**Issue**: tasks.mdでタスク番号が連続していない。セクション「7. Claude Code リモート実行」のサブタスクが「8.1」から始まっており、7.1〜7.4が欠落している。

**Judgment**: **Fix Required** ✅

**Evidence**:
tasks.md の該当箇所を確認:
```markdown
- [ ] 7. Claude Code リモート実行
- [ ] 8.1 リモートサーバー上のClaude Code実行機能を実装
```

セクション7のサブタスクが7.1ではなく8.1から始まっており、これは明らかな番号付けミスである。

**Action Items**:
- tasks.md のタスク番号を修正:
  - 8.1 → 7.1
  - 8.2 → 7.2
  - 8.3 → 7.3
  - 8.4 → 7.4
- 以降のセクション番号を連番に修正（9→8, 10→9, ... 15→14）

---

### C2: Requirement 2.7への参照（存在しない）

**Issue**: tasks.md 9.2（認証プログレスとダイアログ）が `Requirements: 2.7` を参照しているが、requirements.mdのRequirement 2にはAC 2.1〜2.6までしか存在しない。

**Judgment**: **Fix Required** ✅

**Evidence**:
tasks.md:
```markdown
- [ ] 9.2 認証プログレスとダイアログを実装
  ...
  - _Requirements: 2.7, 9.1, 9.2_
```

requirements.md Requirement 2:
- AC 2.1〜2.6 まで定義
- AC 2.7 は存在しない

ただし、requirements.md AC 2.6 が「認証試行中にプログレスインジケータを表示する」であり、これがtask 9.2の「認証プログレス」に該当する。

**Action Items**:
- tasks.md 9.2 の `Requirements: 2.7` を `Requirements: 2.6` に修正

---

## Response to Warnings

### W1: UI Component設計の欠落

**Issue**: Design.mdにはサービス層のインターフェース定義が充実しているが、UIコンポーネント（接続状態ステータスバー、パスワード入力ダイアログ、ホストキー確認ダイアログ等）の明示的な設計がない。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
本プロジェクトの設計方針を確認すると:

1. Design.md の構成はサービス層・インターフェース定義に焦点を当てている
2. UIコンポーネントは既存のReact/Zustandパターンに従い実装時に決定する方針
3. tech.mdによるとUI層はReact + Zustandで構成されており、既存のダイアログパターン（例：プロジェクト選択ダイアログ）を踏襲可能
4. tasks.md には UI実装タスク（9.1, 9.2, 10.2, 11.1, 12.2等）が明記されており、実装指針は十分

UIコンポーネントの詳細設計をDesign.mdに追加することは有益だが、現時点で実装をブロックする問題ではない。

---

### W2: RemoteFileWatcherのタスク欠落

**Issue**: Design.mdで定義された `RemoteFileWatcher` コンポーネントに対応する明示的なタスクがない。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
tasks.md Task 5.3 を確認:
```markdown
- [ ] 5.3 SSHFileSystemProviderを実装
  - SFTPプロトコルを使用したリモートファイル操作
  - ...
  - ポーリングベースのリモートファイル監視  ← ここでカバー
```

「ポーリングベースのリモートファイル監視」が Task 5.3 に明記されており、RemoteFileWatcherの機能はSSHFileSystemProvider実装の一部としてカバーされている。Design.mdでもRemoteFileWatcherはSSHFileSystemProviderと連携する位置づけ。

---

### W3: エラーリトライ戦略の詳細

**Issue**: Design.mdで「自動再接続を3回まで試行」と記載されているが、リトライ間隔、リトライ中のUI状態、リトライ失敗後の復旧手順が明記されていない。

**Judgment**: **Needs Discussion** ⚠️

**Evidence**:
Design.md Error Handling セクション:
```markdown
**Network Errors** (CONNECTION_LOST, TIMEOUT):
- 自動再接続を3回まで試行
- 再接続中はUIにローディング状態を表示
- 失敗時は手動再接続ボタンを表示
```

リトライ間隔（即時か指数バックオフか）は未定義。以下の選択肢がある：

1. **即時リトライ**: 短時間の接続断に対応しやすい
2. **指数バックオフ**: サーバー負荷軽減、ネットワーク回復待機

**推奨**: 初回即時→1秒→2秒の固定間隔で十分。実装時に調整可能な設定値として定義すればよい。

---

### W4: 既存サービス変更のリスク

**Issue**: Task 14.2で「既存のSpecManagerServiceをProvider対応に拡張」とあり、既存コードの変更を伴うためリグレッションリスクがある。

**Judgment**: **No Fix Needed** ❌

**Evidence**:
このリスクは認識されており、以下の対策が既にtasks.mdに含まれている：

1. Task 14.2 には「既存のローカル動作との後方互換性維持」が明記
2. Task 5.4, 6.4 でProvider層のユニット・統合テストを実施
3. Task 15.1-15.3 でE2Eテストにより全体動作を確認

リファクタリング計画の詳細化は有益だが、タスク構成として既にテスト戦略が組み込まれており、ブロッカーではない。

---

### W5（レビュー記載なし）: Requirements参照の誤り

**Note**: W1としてリストされていたが、Critical Issue C2と同一内容のため、C2で対応済み。

---

## Response to Info (Low Priority)

| #    | Issue                          | Judgment      | Reason                                                           |
| ---- | ------------------------------ | ------------- | ---------------------------------------------------------------- |
| I1   | 用語の軽微な揺れ（ssh-agent/agent）   | No Fix Needed | 意味は同一、実害なし                                                       |
| I2   | 大容量ファイル転送の詳細仕様なし           | No Fix Needed | 実装時に決定可能な詳細。Requirements範囲外                                       |
| I3   | デプロイメント/マイグレーション考慮なし        | No Fix Needed | 新機能のため該当なし。レビュー自体が「該当なし」と認識している                                   |

---

## 曖昧点（Ambiguities）への対応

| ID  | 項目                          | 対応方針                                                       |
| --- | --------------------------- | ---------------------------------------------------------- |
| A1  | リモートClaude Codeバージョン        | 実装時にバージョン互換性チェックを追加（Task 8.1で対応予定）                         |
| A2  | ホストキー「セッション限定承認」            | Design.mdに記載あり。Requirementsに明記されていないが、セキュリティ強化オプションとして実装可能   |
| A3  | ファイル監視ポーリング間隔               | 実装時に決定。5秒間隔を基準とし、設定可能にする                                     |
| A4  | 「データ転送量」の追跡                 | 接続単位で追跡。Task 4.2で対応予定                                         |
| A5  | 接続履歴10件の挙動                  | FIFO方式（最古を削除）。Requirements 8.6「最大10件まで保存」を満たす               |

---

## Files to Modify

| File      | Changes                                                  |
| --------- | -------------------------------------------------------- |
| tasks.md  | タスク番号を連番に修正（7.1〜7.4, 8→7, 9→8, ..., 15→14）                   |
| tasks.md  | Task 9.2（修正後は Task 8.2）の `Requirements: 2.7` を `2.6` に修正 |

---

## Conclusion

**修正必要**: 2件（Critical Issues）

1. タスク番号の連番修正
2. 存在しないRequirement参照の修正

いずれもtasks.mdの軽微な修正で対応可能。

**修正不要**: 6件

レビューの多くの指摘は、既存ドキュメントで暗黙的にカバーされているか、実装時に決定可能な詳細事項である。

**要検討**: 1件

リトライ戦略の詳細（間隔設定）は実装前に方針を決定しておくと良い。

---

**次のステップ**:
1. `--fix` オプションを付けてこのコマンドを再実行し、修正を適用
2. 修正完了後、`/kiro:spec-impl ssh-remote-project` で実装を開始

---

_This reply was generated by the document-review-reply command._
