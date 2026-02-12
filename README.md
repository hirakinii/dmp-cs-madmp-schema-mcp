# maDMP Schema MCP Server

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![License: Unilicense](https://img.shields.io/badge/Unilicense-blue.svg)](https://opensource.org/licenses/Apache-2.0)

An MCP server for searching and referencing entities defined in `$defs` of the maDMP (machine-actionable Data Management Plans) schema (version 1.2).

## Features

### MCP Tools

| Tool Name            | Description                                                                                    |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| `list_definitions`   | Returns a list of all definition names and descriptions in the schema                          |
| `search_definitions` | Searches definitions by keyword (case-insensitive partial match on names and descriptions)     |
| `get_definition`     | Retrieves the complete JSON Schema structure for a given definition name (with `$ref` resolution option) |

### MCP Resources

| URI Template                 | Description                                                                                         |
| ---------------------------- | --------------------------------------------------------------------------------------------------- |
| `schema://madmp/defs/{name}` | Returns the JSON Schema for a specified definition with `$ref` resolved. Supports listing and name completion |

## Tech Stack

- **Language**: TypeScript (ES2022, ESM)
- **MCP SDK**: `@modelcontextprotocol/sdk`
- **Validation**: Zod v4
- **Testing**: Vitest
- **Linter/Formatter**: ESLint + Prettier

## Setup

```bash
git clone <repository-url>
cd dmp-cs-madmp-schema-mcp
npm install
```

## Scripts

```bash
npm run build          # TypeScript compilation
npm run dev            # Development run with tsx
npm start              # Run compiled JS

npm test               # Run tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage

npm run lint           # ESLint check
npm run lint:fix       # ESLint auto-fix
npm run typecheck      # Type checking
npm run format         # Prettier format
npm run format:check   # Prettier format check
```

## Project Structure

```
src/
├── index.ts                    # Entry point (server startup)
├── tools.ts                    # MCP tool registration
├── tools.test.ts               # Tool tests
├── resources.ts                # MCP resource registration
├── resources.test.ts           # Resource tests
└── utils/
    ├── schema-loader.ts        # Schema loading, index building, $ref resolution
    └── schema-loader.test.ts   # Schema loader tests
schema/
└── 1.2/
    └── maDMP-schema-1.2.json   # maDMP schema file
```

## MCP Client Configuration Example

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

## Schema Information

This project references `schema/1.2/maDMP-schema-1.2.json` and targets each entity defined in the `$defs` section (Affiliation, Contact, Cost, Dataset, Project, etc.) for search.

## License

See [LICENSE](./LICENSE).
