import { describe, it, expect, beforeAll } from "vitest";
import { loadSchema, type SchemaIndex, type DefinitionEntry } from "./schema-loader.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCHEMA_PATH = path.join(__dirname, "..", "schema", "1.2", "maDMP-schema-1.2.json");

/* eslint-disable @typescript-eslint/no-explicit-any */

describe("loadSchema", () => {
  let index: SchemaIndex;

  beforeAll(() => {
    index = loadSchema(SCHEMA_PATH);
  });

  describe("loading", () => {
    it("should load schema file and return a SchemaIndex", () => {
      expect(index).toBeDefined();
      expect(index.definitions).toBeDefined();
      expect(typeof index.definitions).toBe("object");
    });

    it("should throw an error for a non-existent file", () => {
      expect(() => loadSchema("/non/existent/path.json")).toThrow();
    });

    it("should throw an error for invalid JSON", () => {
      expect(() => loadSchema(__filename)).toThrow();
    });
  });

  describe("indexing", () => {
    it("should index all $defs keys", () => {
      const keys = Object.keys(index.definitions);
      expect(keys.length).toBeGreaterThan(0);
      expect(keys).toContain("Affiliation");
      expect(keys).toContain("Project");
      expect(keys).toContain("Dataset");
      expect(keys).toContain("Contact");
      expect(keys).toContain("Cost");
    });

    it("should map definition name to DefinitionEntry with description", () => {
      const contact: DefinitionEntry = index.definitions["Contact"];
      expect(contact).toBeDefined();
      expect(contact.name).toBe("Contact");
      expect(contact.description).toContain("party which can provide any information on the DMP");
    });

    it("should handle definitions without a description", () => {
      const affiliation: DefinitionEntry = index.definitions["Affiliation"];
      expect(affiliation).toBeDefined();
      expect(affiliation.name).toBe("Affiliation");
      expect(affiliation.description).toBeUndefined();
    });

    it("should include the title from the schema", () => {
      const contact: DefinitionEntry = index.definitions["Contact"];
      expect(contact.title).toBe("Contact");

      const datasetId: DefinitionEntry = index.definitions["DatasetID"];
      expect(datasetId.title).toBe("Dataset ID");
    });

    it("should include the raw schema definition", () => {
      const cost: DefinitionEntry = index.definitions["Cost"];
      expect(cost.rawSchema).toBeDefined();
      expect(cost.rawSchema.type).toBe("object");
      expect(cost.rawSchema.properties).toBeDefined();
    });
  });

  describe("$ref resolution", () => {
    it("should resolve $ref in property values to expanded definitions", () => {
      const cost: DefinitionEntry = index.definitions["Cost"];
      const resolved = index.resolveRefs(cost.rawSchema) as any;
      // currency_code originally has "$ref": "#/$defs/CurrencyCode"
      // After resolution, it should be expanded
      expect(resolved.properties.currency_code).toBeDefined();
      expect(resolved.properties.currency_code.$ref).toBeUndefined();
      expect(resolved.properties.currency_code.type).toBe("string");
      expect(resolved.properties.currency_code.enum).toBeDefined();
    });

    it("should resolve nested $ref in arrays", () => {
      const contact: DefinitionEntry = index.definitions["Contact"];
      const resolved = index.resolveRefs(contact.rawSchema) as any;
      // affiliation.items should have been resolved from $ref to Affiliation
      expect(resolved.properties.affiliation.items).toBeDefined();
      expect(resolved.properties.affiliation.items.$ref).toBeUndefined();
      expect(resolved.properties.affiliation.items.type).toBe("object");
    });

    it("should resolve $ref inside oneOf", () => {
      const contact: DefinitionEntry = index.definitions["Contact"];
      const resolved = index.resolveRefs(contact.rawSchema) as any;
      // contact_id uses oneOf with $ref to ContactID
      expect(resolved.properties.contact_id.oneOf).toBeDefined();
      const firstOption = resolved.properties.contact_id.oneOf[0];
      expect(firstOption.$ref).toBeUndefined();
      expect(firstOption.type).toBe("object");
    });

    it("should not mutate the original rawSchema", () => {
      const cost: DefinitionEntry = index.definitions["Cost"];
      const props = cost.rawSchema.properties as any;
      const originalRef = props.currency_code.$ref;
      index.resolveRefs(cost.rawSchema);
      expect(props.currency_code.$ref).toBe(originalRef);
    });

    it("should handle definitions with no $ref gracefully", () => {
      const booleanish: DefinitionEntry = index.definitions["Booleanish"];
      const resolved = index.resolveRefs(booleanish.rawSchema);
      expect(resolved.type).toBe("string");
      expect(resolved.enum).toEqual(["yes", "no", "unknown"]);
    });

    it("should resolve deeply nested $ref chains", () => {
      // Dataset -> Distribution -> Host -> Certification
      const dataset: DefinitionEntry = index.definitions["Dataset"];
      const resolved = index.resolveRefs(dataset.rawSchema) as any;
      // distribution items should be resolved
      const distribution = resolved.properties.distribution.items;
      expect(distribution.$ref).toBeUndefined();
      expect(distribution.type).toBe("object");
      // host inside distribution should also be resolved
      expect(distribution.properties.host.type).toBe("object");
      expect(distribution.properties.host.properties.certified_with).toBeDefined();
      expect(distribution.properties.host.properties.certified_with.type).toBe("string");
    });
  });

  describe("getDefinitionList", () => {
    it("should return a list of all definition names with descriptions", () => {
      const list = index.getDefinitionList();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);

      const contact = list.find((d) => d.name === "Contact");
      expect(contact).toBeDefined();
      expect(contact!.description).toContain("party which can provide any information");
    });

    it("should include entries without descriptions", () => {
      const list = index.getDefinitionList();
      const affiliation = list.find((d) => d.name === "Affiliation");
      expect(affiliation).toBeDefined();
    });
  });
});
