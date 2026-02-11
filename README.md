# maDMP Schema MCP Server

このプロジェクトは、machine-actionable Data Management Plans (maDMP) スキーマ（バージョン1.2）の `$defs` 内に定義されているエンティティを検索するためのMCP (Machine-actionable Content Platform) サーバーです。TypeScriptで開発されています。

## プロジェクトの目的

maDMPスキーマ内の特定のデータ構造やエンティティを効率的に検索・管理するためのバックエンドサービスを提供します。これにより、maDMPデータの活用と相互運用性を促進します。

## 技術スタック

-   **言語**: TypeScript
-   **フレームワーク**: (今後決定/追加予定)
-   **パッケージマネージャー**: npm または yarn

## セットアップ

1.  リポジトリをクローンします。
    ```bash
    git clone https://github.com/your-org/dmp-cs-madmp-schema-mcp.git
    cd dmp-cs-madmp-schema-mcp
    ```
2.  依存関係をインストールします。
    ```bash
    npm install
    # または yarn install
    ```

## 開発

プロジェクトをローカルで開発するために、以下のコマンドを使用します。

```bash
# 開発サーバーの起動 (設定後に追加)
# npm run dev
```

## テスト

(テストフレームワーク設定後に追加)

## デプロイ

(デプロイ手順設定後に追加)

## スキーマ情報

このプロジェクトは、以下のスキーマファイルを参照しています。
- `schema/1.2/maDMP-schema-1.2.json`

このスキーマファイルには、MCPサーバーが検索対象とする様々なエンティティが `$defs` セクションに定義されています。
