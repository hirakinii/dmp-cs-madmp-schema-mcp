import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { SchemaIndex } from "./utils/schema-loader.js";

export function registerTools(server: McpServer, index: SchemaIndex): void {
  server.registerTool(
    "list_definitions",
    {
      description: "List all available definition names and descriptions in the maDMP schema.",
    },
    async () => {
      const list = index.getDefinitionList();
      return {
        content: [{ type: "text" as const, text: JSON.stringify(list, null, 2) }],
      };
    },
  );

  server.registerTool(
    "search_definitions",
    {
      description:
        "Search for definitions by keyword. Matches against definition names and descriptions (case-insensitive).",
      inputSchema: {
        query: z.string().describe("Keyword to search for (e.g. 'project', 'cost', 'id')"),
      },
    },
    async ({ query }) => {
      const lowerQuery = query.toLowerCase();

      const matches = Object.values(index.definitions)
        .filter((entry) => {
          const nameMatch = entry.name.toLowerCase().includes(lowerQuery);
          const descMatch = entry.description?.toLowerCase().includes(lowerQuery) ?? false;
          return nameMatch || descMatch;
        })
        .map((entry) => ({
          name: entry.name,
          description: entry.description,
        }));

      return {
        content: [{ type: "text" as const, text: JSON.stringify(matches, null, 2) }],
      };
    },
  );

  server.registerTool(
    "get_definition",
    {
      description:
        "Get the full JSON Schema structure for a specific definition by exact name (e.g. 'Cost', 'Project').",
      inputSchema: {
        name: z.string().describe("The exact name of the definition (e.g. 'Cost', 'Project')"),
        resolve_refs: z
          .boolean()
          .default(true)
          .describe("Whether to resolve $ref references inline (default: true)"),
      },
    },
    async ({ name, resolve_refs }) => {
      const entry = index.definitions[name];

      if (!entry) {
        return {
          content: [{ type: "text" as const, text: `Definition '${name}' not found.` }],
          isError: true,
        };
      }

      const schema = resolve_refs ? index.resolveRefs(entry.rawSchema) : entry.rawSchema;

      return {
        content: [{ type: "text" as const, text: JSON.stringify(schema, null, 2) }],
      };
    },
  );
}
