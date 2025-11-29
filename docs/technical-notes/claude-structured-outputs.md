# Claude API Structured Outputs

Claude APIでZodスキーマを使って返答形式を厳密に強制する方法。

## 概要

- **目的**: AIの余計なテキストを排除し、アルゴリズム的に処理可能な構造化データを取得
- **保証**: `JSON.parse()`エラーなし、型安全なレスポンス
- **ステータス**: ベータ機能（2025年11月時点）

## 方法1: JSON出力モード（推奨）

```typescript
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';

const client = new Anthropic();

const ResultSchema = z.object({
  status: z.enum(['success', 'error']),
  data: z.array(z.string()),
  count: z.number(),
});

const response = await client.beta.messages.parse({
  model: "claude-sonnet-4-5-20250929",
  betas: ["structured-outputs-2025-11-13"],
  output_format: betaZodOutputFormat(ResultSchema),
  messages: [{ role: "user", content: "..." }]
});

// response.parsed は型安全なオブジェクト
console.log(response.parsed.status); // 型推論が効く
```

## 方法2: Tool Use強制（従来の方法）

ツールを定義し、`tool_choice`で強制的に使わせる方法：

```typescript
const response = await client.messages.create({
  model: "claude-sonnet-4-5-20250929",
  tools: [{
    name: "output_result",
    description: "結果を出力",
    strict: true,  // 厳格モード
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["success", "error"] },
        data: { type: "array", items: { type: "string" } }
      },
      required: ["status", "data"],
      additionalProperties: false
    }
  }],
  tool_choice: { type: "tool", name: "output_result" },  // 強制
  messages: [...]
});

// レスポンスからツール入力を取得
const toolUse = response.content.find(block => block.type === 'tool_use');
const result = toolUse.input; // { status: "...", data: [...] }
```

## 方法3: Vercel AI SDK

`generateObject`でZodスキーマを直接渡せる：

```typescript
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

const { object } = await generateObject({
  model: anthropic('claude-sonnet-4-5-20250929'),
  schema: z.object({
    title: z.string(),
    tags: z.array(z.string()),
    priority: z.number().min(1).max(5),
  }),
  prompt: "このタスクを分析して...",
});

console.log(object.title); // 型安全
```

## Claude CLIについて

**Claude CLI（`claude`コマンド）自体にはStructured Outputs機能は組み込まれていない**。

CLIは対話的な開発支援ツールとして設計されており、プログラマティックな出力制御は想定されていない。

構造化出力が必要な場合は：
- Claude APIを直接使用
- Claude Agent SDKを使用
- Vercel AI SDKを使用

## 注意点

### ベータヘッダー必須

```typescript
betas: ["structured-outputs-2025-11-13"]
```

### パフォーマンス

- 初回リクエスト: 文法コンパイルで100-300msのオーバーヘッド
- 24時間キャッシュされるため、同じスキーマの後続リクエストは高速

### 制約

- 数値の`minimum`/`maximum`制約はスキーマでは強制されない（別途バリデーション必要）
- 対応モデル: Claude Sonnet 4.5, Opus 4.1（Haiku 4.5は準備中）
- Claude 3.xモデルは非対応

## 参考リンク

- [Structured outputs - Claude Docs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- [How to get consistent structured output from Claude](https://dev.to/heuperman/how-to-get-consistent-structured-output-from-claude-20o5)
- [Claude API Structured Output Guide](https://thomas-wiegold.com/blog/claude-api-structured-output/)
