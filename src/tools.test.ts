import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { loadSchema } from "./schema-loader.js";
import { registerTools } from "./tools.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCHEMA_PATH = path.join(__dirname, "..", "schema", "1.2", "maDMP-schema-1.2.json");

/* eslint-disable @typescript-eslint/no-explicit-any */

function getTextContent(result: Record<string, unknown>): string {
  const content = result.content as Array<{ type: string; text: string }>;
  return content[0].text;
}

describe("MCP Tools", () => {
  let client: Client;
  let server: McpServer;

  beforeAll(async () => {
    const index = loadSchema(SCHEMA_PATH);
    server = new McpServer({ name: "test-server", version: "1.0.0" });
    registerTools(server, index);

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    client = new Client({ name: "test-client", version: "1.0.0" });
    await client.connect(clientTransport);
  });

  afterAll(async () => {
    await client.close();
    await server.close();
  });

  describe("list_definitions", () => {
    it("should return all definitions as JSON text content", async () => {
      const result = await client.callTool({ name: "list_definitions" });
      expect(result.isError).toBeFalsy();

      const content = result.content as Array<{ type: string; text: string }>;
      expect(content).toHaveLength(1);
      expect(content[0].type).toBe("text");

      const definitions = JSON.parse(content[0].text);
      expect(Array.isArray(definitions)).toBe(true);
      expect(definitions.length).toBeGreaterThan(0);
    });

    it("should include known definitions", async () => {
      const result = await client.callTool({ name: "list_definitions" });
      const definitions = JSON.parse(getTextContent(result));

      const names = definitions.map((d: any) => d.name);
      expect(names).toContain("Affiliation");
      expect(names).toContain("Contact");
      expect(names).toContain("Cost");
      expect(names).toContain("Dataset");
      expect(names).toContain("Project");
    });

    it("should include name and description for each entry", async () => {
      const result = await client.callTool({ name: "list_definitions" });
      const definitions = JSON.parse(getTextContent(result));

      for (const def of definitions) {
        expect(def).toHaveProperty("name");
        expect(typeof def.name).toBe("string");
      }

      const contact = definitions.find((d: any) => d.name === "Contact");
      expect(contact.description).toContain("party which can provide any information");
    });
  });

  describe("search_definitions", () => {
    it("should find definitions matching by name", async () => {
      const result = await client.callTool({
        name: "search_definitions",
        arguments: { query: "Cost" },
      });
      expect(result.isError).toBeFalsy();

      const matches = JSON.parse(getTextContent(result));
      const names = matches.map((m: any) => m.name);
      expect(names).toContain("Cost");
    });

    it("should be case-insensitive", async () => {
      const result = await client.callTool({
        name: "search_definitions",
        arguments: { query: "cost" },
      });
      const matches = JSON.parse(getTextContent(result));
      const names = matches.map((m: any) => m.name);
      expect(names).toContain("Cost");
    });

    it("should match partial names", async () => {
      const result = await client.callTool({
        name: "search_definitions",
        arguments: { query: "ID" },
      });
      const matches = JSON.parse(getTextContent(result));
      const names = matches.map((m: any) => m.name);

      expect(names.some((n: string) => n.includes("ID"))).toBe(true);
      expect(matches.length).toBeGreaterThan(1);
    });

    it("should also search in descriptions", async () => {
      const result = await client.callTool({
        name: "search_definitions",
        arguments: { query: "funder" },
      });
      const matches = JSON.parse(getTextContent(result));

      expect(matches.length).toBeGreaterThan(0);
    });

    it("should return empty array for no match", async () => {
      const result = await client.callTool({
        name: "search_definitions",
        arguments: { query: "zzz_nonexistent_zzz" },
      });
      expect(result.isError).toBeFalsy();

      const matches = JSON.parse(getTextContent(result));
      expect(matches).toEqual([]);
    });
  });

  describe("get_definition", () => {
    it("should return the full schema for a valid definition name", async () => {
      const result = await client.callTool({
        name: "get_definition",
        arguments: { name: "Cost" },
      });
      expect(result.isError).toBeFalsy();

      const schema = JSON.parse(getTextContent(result));
      expect(schema.type).toBe("object");
      expect(schema.properties).toBeDefined();
      expect(schema.properties.title).toBeDefined();
      expect(schema.properties.currency_code).toBeDefined();
    });

    it("should resolve $refs by default", async () => {
      const result = await client.callTool({
        name: "get_definition",
        arguments: { name: "Cost" },
      });
      const schema = JSON.parse(getTextContent(result));

      // currency_code originally has "$ref": "#/$defs/CurrencyCode"
      // After resolution, it should be expanded
      expect(schema.properties.currency_code.$ref).toBeUndefined();
      expect(schema.properties.currency_code.type).toBe("string");
      expect(schema.properties.currency_code.enum).toBeDefined();
    });

    it("should return raw schema when resolve_refs is false", async () => {
      const result = await client.callTool({
        name: "get_definition",
        arguments: { name: "Cost", resolve_refs: false },
      });
      const schema = JSON.parse(getTextContent(result));

      expect(schema.properties.currency_code.$ref).toBe("#/$defs/CurrencyCode");
    });

    it("should return isError for non-existent definition", async () => {
      const result = await client.callTool({
        name: "get_definition",
        arguments: { name: "NonExistent" },
      });
      expect(result.isError).toBe(true);
    });
  });
});
