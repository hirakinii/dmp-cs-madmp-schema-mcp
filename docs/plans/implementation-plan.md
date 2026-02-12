# maDMP schema MPC server 実装計画

maDMP (machine-actionable Data Management Plans) の共通標準スキーマ `$defs` 内のエンティティを検索・取得できる MCP (Model Context Protocol) サーバーの開発計画を提案します。

提供された `maDMP-schema-1.2.json` は、`$defs` 内に `Affiliation`, `Contact`, `Cost`, `Dataset` などの再利用可能なデータ定義を持っており、これらをAIが効率的に参照できるようにすることが目的となります。

以下に、TypeScript と Node.js を用いた実装計画を提示します。

**MUST:**

* 開発は TDD (Test-Driven Development) サイクルを厳守し、テストカバレッジ >80% を維持しながら進めます。

## 1. アーキテクチャ概要

このプロジェクトは、ローカルまたはリモートにある JSON スキーマファイルを読み込み、MCP プロトコルを通じて AI モデル（クライアント）からの「検索リクエスト」に応答するサーバーです。

## 2. 開発ステップ計画

開発を以下の5つのフェーズに分けて進めることを推奨します。

### Phase 1: 環境構築とプロジェクトセットアップ

基本的な Node.js + TypeScript 環境と、MCP SDK の導入を行います。

* **言語**: TypeScript (Node.js)
* **初期化**: `npm init` および `tsc --init`
* **依存関係**:
    * `@modelcontextprotocol/sdk`: MCP サーバー構築用公式 SDK
    * `zod`: 入力スキーマのバリデーション用
    * `typescript`, `tsx`: 開発・実行用
* **構成**: `maDMP-schema-1.2.json` は `schema/1.2/` ディレクトリに配置されます。

### Phase 2: スキーマローダーの実装 (Schema Handler)

JSON ファイルを読み込み、検索しやすく整形するロジックを作成します。

* **読み込み**: サーバー起動時に JSON ファイルをメモリにロードします。
* **インデックス化**: `$defs` オブジェクトのキー（例: `Affiliation`, `Project`）と、その `description` プロパティをマッピングし、検索可能なリストを作成します。
* **参照解決 ($ref) の検討**: スキーマ内では `"$ref": "\#/$defs/ContactID"\` のように内部参照が多用されています。
    * *簡易実装*: 参照文字列をそのまま返す。
    * *高度な実装*: 参照先の内容を展開して表示する（推奨）。

### Phase 3: MCP ツール (Tool) の実装

MCP の「Tool」機能を使用して、AI がスキーマを問い合わせるための関数を定義します。以下の2つのツールを用意するのが効果的です。

1. **`list_definitions`**:
    * **機能**: 利用可能な定義の一覧（名前と概要）を返す。
    * **ユースケース**: ユーザーが「どのようなデータ型が定義されているか知りたい」と聞いた時。

2. **`search_definitions`**:
    * **機能**: ユーザーのあいまいな入力から候補となる定義を探して返す。
    * **ユースケース**: ユーザーが「Project が名前に入っているデータ型を知りたい」と聞いた時。

3. **`get_definition`**:
    * **機能**: 特定の定義名（例: "Cost"）を受け取り、その詳細な JSON スキーマ構造を返す。
    * **ユースケース**: ユーザーが「Cost オブジェクトの構造を教えて」と聞いた時。

### Phase 4: テストとデバッグ

* **MCP Inspector**: MCP 公式の Inspector ツールを使用して、ブラウザ上でツールの動作確認を行います。
* **AI クライアント接続**: Claude Desktop アプリやその他の MCP クライアント設定ファイルにサーバーを追加し、実際に会話形式でデータが取得できるか確認します。

### Phase 5: MCP リソース (Resource) の実装 (オプション)

ツールだけでなく、「リソース」としてスキーマ全体や特定のエントリポイントを提供することも検討します。

* `schema://madmp/defs/{name}` のような URI で特定の定義に直接アクセスできるようにします。

---

## 3. 実装プロトタイプ (コード例)

以下は、`index.ts` の実装イメージです。

```typescript
#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// __dirname の代替 (ESM環境の場合)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. スキーマデータの読み込み
// ※ maDMP-schema-1.2.json はこのファイルと同じディレクトリに配置することを想定
const SCHEMA_PATH = path.join(__dirname, "maDMP-schema-1.2.json");

let schemaDefs: Record<string, any> = {};

try {
  const rawData = fs.readFileSync(SCHEMA_PATH, "utf-8");
  const json = JSON.parse(rawData);
  // $defs が存在しない場合は空オブジェクトとする
  schemaDefs = json.$defs || {};
  console.error(`Loaded ${Object.keys(schemaDefs).length} definitions from schema.`);
} catch (error) {
  console.error("Failed to load schema file:", error);
  process.exit(1);
}

// 2. サーバーインスタンスの作成
const server = new McpServer({
  name: "madmp-schema-search",
  version: "1.0.0",
});

// 3. ツールの定義

/**
 * Tool: list_definitions
 * 目的: 利用可能な定義の一覧（名前と概要）を返す
 */
server.tool(
  "list_definitions",
  { description: "maDMPスキーマで定義されている定義の一覧を取得します。" },
  async () => {
    const list = Object.entries(defs).map(([key, value]: [string, any]) => ({
      name: key,
      description: value.description || "No description available",
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(list, null, 2) }],
    };
  }
);

/**
 * Tool: search_definitions
 * 目的: ユーザーのあいまいな入力から候補となる定義を探す
 */
server.tool(
  "search_definitions",
  {
    query: z.string().describe("検索したい定義のキーワード (例: 'project', 'cost', 'id')"),
  },
  async ({ query }) => {
    const lowerQuery = query.toLowerCase();
    
    // 定義名(Key)がクエリを含むものをフィルタリング (部分一致・大文字小文字無視)
    const matches = Object.entries(schemaDefs)
      .filter(([key]) => key.toLowerCase().includes(lowerQuery))
      .map(([key, value]) => ({
        name: key,
        // descriptionがあれば使用し、なければプレースホルダー
        description: value.description || "(No description provided)",
      }));

    if (matches.length === 0) {
      return {
        content: [{ type: "text", text: `No definitions found matching '${query}'.` }],
      };
    }

    // AIが読みやすい形式でリストを返す
    const formattedList = matches
      .map((m) => `- **${m.name}**: ${m.description}`)
      .join("\n");

    return {
      content: [{ 
        type: "text", 
        text: `Found ${matches.length} matches for '${query}':\n\n${formattedList}` 
      }],
    };
  }
);

/**
 * Tool: get_definition
 * 目的: 特定の定義の詳細スキーマを取得する ($refはそのまま)
 */
server.tool(
  "get_definition",
  {
    name: z.string().describe("取得したい定義の正確な名前 (例: 'Project', 'Cost')"),
  },
  async ({ name }) => {
    const definition = schemaDefs[name];

    if (!definition) {
      return {
        content: [{ type: "text", text: `Error: Definition '${name}' not found.` }],
        isError: true,
      };
    }

    return {
      content: [{ 
        type: "text", 
        // 整形してJSONを返す
        text: JSON.stringify(definition, null, 2) 
      }],
    };
  }
);

// 4. トランスポート層の接続 (Stdio)
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("maDMP Schema MCP Server running on Stdio...");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});

```

以下は `mcp_config.json` の設定例です。

```json
{
  "mcpServers": {
    "madmp-schema": {
      "command": "node",
      "args": [
        "/absolute/path/to/your/madmp-mcp/dist/index.js"
      ]
    }
  }
}
```
