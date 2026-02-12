import fs from "fs";

export interface DefinitionEntry {
  name: string;
  title?: string;
  description?: string;
  rawSchema: Record<string, unknown>;
}

export interface SchemaIndex {
  definitions: Record<string, DefinitionEntry>;
  resolveRefs: (schema: Record<string, unknown>) => Record<string, unknown>;
  getDefinitionList: () => Array<{ name: string; description?: string }>;
}

/**
 * Loads a maDMP JSON schema file and builds a searchable index of its $defs.
 *
 * - Reads the JSON file from disk
 * - Indexes all $defs keys with their name, title, description, and raw schema
 * - Provides $ref resolution that expands internal references recursively
 */
export function loadSchema(filePath: string): SchemaIndex {
  const rawData = fs.readFileSync(filePath, "utf-8");
  const json = JSON.parse(rawData);

  if (!json.$defs || typeof json.$defs !== "object") {
    throw new Error("Schema file does not contain a valid $defs object");
  }

  const defs: Record<string, unknown> = json.$defs;

  const definitions: Record<string, DefinitionEntry> = {};
  for (const [key, value] of Object.entries(defs)) {
    const def = value as Record<string, unknown>;
    definitions[key] = {
      name: key,
      title: def.title as string | undefined,
      description: def.description as string | undefined,
      rawSchema: def,
    };
  }

  function resolveRefsInternal(node: unknown, visited: Set<string> = new Set()): unknown {
    if (node === null || typeof node !== "object") {
      return node;
    }

    if (Array.isArray(node)) {
      return node.map((item) => resolveRefsInternal(item, visited));
    }

    const obj = node as Record<string, unknown>;

    // If this node is a $ref, resolve it
    if (typeof obj.$ref === "string") {
      const refPath = obj.$ref;
      const match = refPath.match(/^#\/\$defs\/(.+)$/);
      if (match) {
        const defName = match[1];
        if (visited.has(defName)) {
          // Prevent infinite recursion on circular references
          return { $ref: refPath, $comment: "circular reference" };
        }
        const refDef = defs[defName];
        if (refDef) {
          const newVisited = new Set(visited);
          newVisited.add(defName);
          return resolveRefsInternal(refDef, newVisited);
        }
      }
      // Return as-is if the $ref can't be resolved
      return obj;
    }

    // Deep clone and resolve all nested $refs
    const resolved: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      resolved[key] = resolveRefsInternal(value, visited);
    }
    return resolved;
  }

  function resolveRefs(schema: Record<string, unknown>): Record<string, unknown> {
    return resolveRefsInternal(schema) as Record<string, unknown>;
  }

  function getDefinitionList(): Array<{ name: string; description?: string }> {
    return Object.values(definitions).map((entry) => ({
      name: entry.name,
      description: entry.description,
    }));
  }

  return {
    definitions,
    resolveRefs,
    getDefinitionList,
  };
}
