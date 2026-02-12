import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { loadSchema } from "./utils/schema-loader.js";
import { registerResources } from "./resources.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCHEMA_PATH = path.join(__dirname, "..", "schema", "1.2", "maDMP-schema-1.2.json");

function getTextContent(result: { contents: Array<{ uri: string; text?: string }> }): string {
  return result.contents[0].text ?? "";
}

describe("MCP Resources", () => {
  let client: Client;
  let server: McpServer;

  beforeAll(async () => {
    const index = loadSchema(SCHEMA_PATH);
    server = new McpServer({ name: "test-server", version: "1.0.0" });
    registerResources(server, index);

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    client = new Client({ name: "test-client", version: "1.0.0" });
    await client.connect(clientTransport);
  });

  afterAll(async () => {
    await client.close();
    await server.close();
  });

  describe("resources/list", () => {
    it("should list all definition resources", async () => {
      const result = await client.listResources();
      expect(result.resources.length).toBeGreaterThan(0);
    });

    it("should include known definitions as resources", async () => {
      const result = await client.listResources();
      const uris = result.resources.map((r) => r.uri);

      expect(uris).toContain("schema://madmp/defs/Affiliation");
      expect(uris).toContain("schema://madmp/defs/Contact");
      expect(uris).toContain("schema://madmp/defs/Cost");
      expect(uris).toContain("schema://madmp/defs/Dataset");
      expect(uris).toContain("schema://madmp/defs/Project");
    });

    it("should include name and description for each resource", async () => {
      const result = await client.listResources();

      for (const resource of result.resources) {
        expect(resource.uri).toMatch(/^schema:\/\/madmp\/defs\/.+$/);
        expect(resource.name).toBeTruthy();
        expect(resource.mimeType).toBe("application/json");
      }

      const contact = result.resources.find((r) => r.name === "Contact");
      expect(contact).toBeDefined();
      expect(contact!.description).toContain("party which can provide any information");
    });
  });

  describe("resources/read - definition by name", () => {
    it("should return the schema for a valid definition", async () => {
      const result = await client.readResource({ uri: "schema://madmp/defs/Cost" });
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe("schema://madmp/defs/Cost");
      expect(result.contents[0].mimeType).toBe("application/json");

      const schema = JSON.parse(getTextContent(result));
      expect(schema.type).toBe("object");
      expect(schema.properties).toBeDefined();
      expect(schema.properties.title).toBeDefined();
    });

    it("should return resolved $refs in schema", async () => {
      const result = await client.readResource({ uri: "schema://madmp/defs/Cost" });
      const schema = JSON.parse(getTextContent(result));

      expect(schema.properties.currency_code.$ref).toBeUndefined();
      expect(schema.properties.currency_code.type).toBe("string");
      expect(schema.properties.currency_code.enum).toBeDefined();
    });

    it("should throw error for non-existent definition", async () => {
      await expect(
        client.readResource({ uri: "schema://madmp/defs/NonExistent" }),
      ).rejects.toThrow();
    });
  });

  describe("resources/templates/list", () => {
    it("should list the definition resource template", async () => {
      const result = await client.listResourceTemplates();
      expect(result.resourceTemplates.length).toBeGreaterThan(0);

      const template = result.resourceTemplates.find(
        (t) => t.uriTemplate === "schema://madmp/defs/{name}",
      );
      expect(template).toBeDefined();
      expect(template!.name).toBe("madmp-definition");
    });
  });
});
