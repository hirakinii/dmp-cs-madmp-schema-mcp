# maDMP Schema MCP Server

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![License: Unilicense](https://img.shields.io/badge/Unilicense-blue.svg)](https://opensource.org/licenses/Apache-2.0)

maDMP (machine-actionable Data Management Plans) スキーマ（バージョン1.2）の `$defs` に定義されたエンティティを検索・参照するための MCP サーバーです。

## 機能

### MCP Tools

| ツール名             | 説明                                                                         |
| -------------------- | ---------------------------------------------------------------------------- |
| `list_definitions`   | スキーマ内の全定義名と説明の一覧を返す                                       |
| `search_definitions` | キーワードで定義を検索（名前・説明を大文字小文字区別なしで部分一致）         |
| `get_definition`     | 定義名を指定して完全な JSON Schema 構造を取得（`$ref` の解決オプション付き） |

### MCP Resources

| URI テンプレート             | 説明                                                                              |
| ---------------------------- | --------------------------------------------------------------------------------- |
| `schema://madmp/defs/{name}` | 指定した定義の JSON Schema を `$ref` 解決済みで返す。一覧取得・名前の補完にも対応 |

## 技術スタック

- **言語**: TypeScript (ES2022, ESM)
- **MCP SDK**: `@modelcontextprotocol/sdk`
- **バリデーション**: Zod v4
- **テスト**: Vitest
- **リンター/フォーマッター**: ESLint + Prettier

## セットアップ

```bash
git clone <repository-url>
cd dmp-cs-madmp-schema-mcp
npm install
```

## スクリプト

```bash
npm run build          # TypeScript コンパイル
npm run dev            # tsx による開発実行
npm start              # コンパイル済み JS を実行

npm test               # テスト実行
npm run test:watch     # テストをウォッチモードで実行
npm run test:coverage  # カバレッジ付きテスト実行

npm run lint           # ESLint チェック
npm run lint:fix       # ESLint 自動修正
npm run typecheck      # 型チェック
npm run format         # Prettier フォーマット
npm run format:check   # Prettier フォーマットチェック
```

## プロジェクト構成

```
src/
├── index.ts                    # エントリポイント（サーバー起動）
├── tools.ts                    # MCP ツール登録
├── tools.test.ts               # ツールのテスト
├── resources.ts                # MCP リソース登録
├── resources.test.ts           # リソースのテスト
└── utils/
    ├── schema-loader.ts        # スキーマ読み込み・インデックス構築・$ref 解決
    └── schema-loader.test.ts   # スキーマローダーのテスト
schema/
└── 1.2/
    └── maDMP-schema-1.2.json   # maDMP スキーマファイル
```

## MCP クライアント設定例

```json
{
  "mcpServers": {
    "madmp-schema": {
      "command": "node",
      "args": ["dist/index.js"]
    }
  }
}
```

## スキーマ情報

このプロジェクトは `schema/1.2/maDMP-schema-1.2.json` を参照し、`$defs` セクションに定義された各エンティティ（Affiliation, Contact, Cost, Dataset, Project 等）を検索対象としています。

## License

See [LICENSE](./LICENSE).
