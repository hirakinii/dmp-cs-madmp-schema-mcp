#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import path from "path";
import { fileURLToPath } from "url";
import { loadSchema } from "./schema-loader.js";
import { registerTools } from "./tools.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCHEMA_PATH = path.join(__dirname, "..", "schema", "1.2", "maDMP-schema-1.2.json");

const index = loadSchema(SCHEMA_PATH);
console.error(`Loaded ${Object.keys(index.definitions).length} definitions from schema.`);

const server = new McpServer({
  name: "madmp-schema-search",
  version: "1.0.0",
});

registerTools(server, index);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("maDMP Schema MCP Server running on Stdio...");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
