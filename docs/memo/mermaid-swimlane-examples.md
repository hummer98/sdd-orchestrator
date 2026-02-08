# Mermaid Swimlane Diagram Examples

Mermaidでスイムレーン的な表現を実現する方法のサンプル集。

## 方法1: Sequence Diagram（推奨）

複数のparticipantを使うことで、自然にスイムレーン的な表現になる。
アクター間のメッセージフローを時系列で表現するのに最適。

```mermaid
sequenceDiagram
    participant User as 👤 User
    participant Frontend as 🖥️ Frontend
    participant API as ⚙️ API Server
    participant DB as 🗄️ Database

    User->>Frontend: フォーム送信
    activate Frontend
    Frontend->>Frontend: バリデーション
    Frontend->>API: POST /api/submit
    activate API
    API->>DB: INSERT INTO records
    activate DB
    DB-->>API: OK (inserted_id)
    deactivate DB
    API-->>Frontend: 200 Success
    deactivate API
    Frontend-->>User: 完了メッセージ表示
    deactivate Frontend
```

### 使用場面
- API呼び出しフロー
- ユーザー操作の処理フロー
- マイクロサービス間通信

---

## 方法2: Flowchart with Subgraphs（横型レーン）

`subgraph`を使って責任範囲を明確に分離。
プロセス全体の流れと担当を同時に表現。

```mermaid
flowchart LR
    subgraph UserLane["👤 User Layer"]
        A[リクエスト開始]
        G[結果確認]
    end

    subgraph FrontendLane["🖥️ Frontend Layer"]
        B[入力バリデーション]
        F[UI更新]
    end

    subgraph BackendLane["⚙️ Backend Layer"]
        C[認証チェック]
        D[ビジネスロジック]
    end

    subgraph DataLane["🗄️ Data Layer"]
        E[永続化処理]
    end

    A --> B --> C --> D --> E --> F --> G
```

### 使用場面
- レイヤードアーキテクチャの可視化
- 責任分担の明確化
- 横断的な処理フローの説明

---

## 方法3: Flowchart with Subgraphs（縦型レーン）

縦方向のフローで、より伝統的なスイムレーン表現に近い形式。

```mermaid
flowchart TB
    subgraph Customer["顧客"]
        C1[注文開始]
        C2[支払い]
        C3[受取確認]
    end

    subgraph Sales["営業部門"]
        S1[注文受付]
        S2[在庫確認]
    end

    subgraph Warehouse["倉庫"]
        W1[ピッキング]
        W2[梱包]
        W3[出荷]
    end

    C1 --> S1
    S1 --> S2
    S2 --> W1
    W1 --> W2
    C2 --> W2
    W2 --> W3
    W3 --> C3
```

### 使用場面
- 業務フロー図
- 部門間連携の可視化
- ワークフロー定義

---

## 方法4: State Diagram（状態遷移）

状態とその遷移を表現。UIの状態管理やライフサイクル表現に最適。

```mermaid
stateDiagram-v2
    [*] --> Idle: 初期化

    Idle --> Loading: fetch開始
    Loading --> Success: データ取得成功
    Loading --> Error: エラー発生

    Success --> Idle: リセット
    Error --> Loading: リトライ
    Error --> Idle: キャンセル

    Success --> [*]: 完了
```

### 使用場面
- UIコンポーネントの状態管理
- 注文ステータスのライフサイクル
- 認証状態の遷移

---

## 方法5: 複合パターン（Sequence + 状態表現）

Sequence Diagramにノートを追加して状態変化も表現。

```mermaid
sequenceDiagram
    participant UI as 🖥️ UI
    participant Store as 📦 State Store
    participant API as ⚙️ API

    Note over UI,Store: State: idle

    UI->>Store: dispatch(fetchStart)
    Note over Store: State: loading
    Store->>API: GET /data

    alt 成功時
        API-->>Store: 200 OK + data
        Note over Store: State: success
        Store-->>UI: 状態更新通知
    else 失敗時
        API-->>Store: 500 Error
        Note over Store: State: error
        Store-->>UI: エラー通知
    end
```

### 使用場面
- Redux/Zustand等の状態管理フロー
- 非同期処理の状態遷移
- エラーハンドリングフロー

---

## spec-design での推奨使用方法

| 表現したい内容 | 推奨Mermaid図 |
|---------------|--------------|
| APIコールフロー | Sequence Diagram |
| コンポーネント間通信 | Sequence Diagram |
| レイヤー責任分担 | Flowchart + Subgraph |
| 状態ライフサイクル | State Diagram |
| 業務プロセス | Flowchart + Subgraph (縦型) |
| エラーハンドリング | Sequence + alt/else |

---

## 参考リンク

- [Mermaid Sequence Diagram](https://mermaid.js.org/syntax/sequenceDiagram.html)
- [Mermaid Flowchart](https://mermaid.js.org/syntax/flowchart.html)
- [Mermaid State Diagram](https://mermaid.js.org/syntax/stateDiagram.html)
