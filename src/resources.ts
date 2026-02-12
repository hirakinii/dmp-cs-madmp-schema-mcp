import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SchemaIndex } from "./utils/schema-loader.js";

export function registerResources(server: McpServer, index: SchemaIndex): void {
  const template = new ResourceTemplate("schema://madmp/defs/{name}", {
    list: async () => {
      return {
        resources: Object.values(index.definitions).map((entry) => ({
          uri: `schema://madmp/defs/${entry.name}`,
          name: entry.name,
          description: entry.description,
          mimeType: "application/json" as const,
        })),
      };
    },
    complete: {
      name: async (value) => {
        return Object.keys(index.definitions).filter((name) =>
          name.toLowerCase().startsWith(value.toLowerCase()),
        );
      },
    },
  });

  server.registerResource(
    "madmp-definition",
    template,
    {
      description: "A specific definition from the maDMP schema",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const name = variables.name as string;
      const entry = index.definitions[name];

      if (!entry) {
        throw new Error(`Definition '${name}' not found.`);
      }

      const resolved = index.resolveRefs(entry.rawSchema);

      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: "application/json",
            text: JSON.stringify(resolved, null, 2),
          },
        ],
      };
    },
  );
}
