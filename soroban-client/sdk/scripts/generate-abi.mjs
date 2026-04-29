import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, "..", "..");
const contractRoot = path.resolve(repoRoot, "soroban-contract", "contracts");
const outputDir = path.resolve(__dirname, "..", "src", "generated", "v2");

const CONTRACTS = [
  { name: "eventManager", path: "event_manager/src/lib.rs" },
  { name: "ticketFactory", path: "ticket_factory/src/lib.rs" },
  { name: "ticketNft", path: "ticket_nft/src/lib.rs" },
  { name: "tbaRegistry", path: "tba_registry/src/lib.rs" },
  { name: "tbaAccount", path: "tba_account/src/lib.rs" },
];

class RustTypeParser {
  constructor(source) {
    this.source = source;
  }

  parseAll() {
    return {
      methods: this.parseMethods(),
      errors: this.parseErrors(),
      structs: this.parseStructs(),
      enums: this.parseEnums(),
    };
  }

  parseMethods() {
    const methodRegex =
      /pub fn ([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\)\s*(?:->\s*([^{]+))?\s*\{/g;
    const methods = [];

    for (const match of this.source.matchAll(methodRegex)) {
      const [, name, rawArgs, rawReturn] = match;

      const args = this.parseMethodArgs(rawArgs);
      const returnType = this.normalizeType(rawReturn || "()");

      methods.push({
        name,
        args,
        returnType,
        isReadOnly: this.isReadOnlyMethod(name),
      });
    }

    return methods;
  }

  parseMethodArgs(rawArgs) {
    return rawArgs
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part && !/^env:\s*Env$/.test(part))
      .map((part) => {
        const [argName, ...typeParts] = part.split(":");
        const typeStr = typeParts.join(":").trim();

        return {
          name: argName.trim(),
          type: this.normalizeType(typeStr),
          optional: typeStr.includes("Option<"),
        };
      });
  }

  parseErrors() {
    const enumBlock = this.source.match(
      /#\[contracterror\][\s\S]*?pub enum Error\s*\{([\s\S]*?)\n\}/,
    );
    if (!enumBlock) return [];

    return enumBlock[1]
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && line.includes("="))
      .map((line) => {
        const cleaned = line.replace(/,$/, "");
        const [name, code] = cleaned.split("=").map((part) => part.trim());
        return {
          name,
          code: Number(code),
          message: this.generateErrorMessage(name),
        };
      });
  }

  parseStructs() {
    const structRegex =
      /#\[contracttype\][\s\S]*?pub struct ([a-zA-Z0-9_]+)\s*\{([\s\S]*?)\n\}/g;
    const structs = [];

    for (const match of this.source.matchAll(structRegex)) {
      const [, name, fieldsBlock] = match;

      const fields = fieldsBlock
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && line.includes(":"))
        .map((line) => {
          const cleaned = line.replace(/,$/, "").replace(/pub\s+/, "");
          const [fieldName, ...typeParts] = cleaned.split(":");
          return {
            name: fieldName.trim(),
            type: this.normalizeType(typeParts.join(":")),
            optional: typeParts.join(":").includes("Option<"),
          };
        });

      structs.push({ name, fields });
    }

    return structs;
  }

  parseEnums() {
    const enumRegex =
      /#\[contracttype\][\s\S]*?pub enum ([a-zA-Z0-9_]+)\s*\{([\s\S]*?)\n\}/g;
    const enums = [];

    for (const match of this.source.matchAll(enumRegex)) {
      const [, name, variantsBlock] = match;

      const variants = variantsBlock
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"))
        .map((line) => {
          const cleaned = line.replace(/,$/, "");
          if (cleaned.includes("(")) {
            const [variantName, dataType] = cleaned.split("(");
            return {
              name: variantName.trim(),
              dataType: this.normalizeType(dataType.replace(")", "")),
            };
          }
          return { name: cleaned };
        });

      enums.push({ name, variants });
    }

    return enums;
  }

  normalizeType(rustType) {
    return rustType
      .replace(/\s+/g, " ")
      .replace(/Result<([^,>]+),[^>]+>/g, "$1")
      .replace(/Option<([^>]+)>/g, "$1 | null")
      .trim();
  }

  isReadOnlyMethod(name) {
    const readOnlyPrefixes = ["get_", "is_", "has_", "can_"];
    const readOnlyNames = [
      "owner_of",
      "balance_of",
      "token",
      "token_contract",
      "token_id",
      "owner",
      "nonce",
      "version",
    ];

    return (
      readOnlyPrefixes.some((prefix) => name.startsWith(prefix)) ||
      readOnlyNames.includes(name)
    );
  }

  generateErrorMessage(errorName) {
    return errorName
      .replace(/([A-Z])/g, " $1")
      .trim()
      .toLowerCase();
  }
}

class TypeMapper {
  static toTypeScript(rustType) {
    const mappings = {
      u32: "number",
      u64: "number",
      u128: "bigint",
      i32: "number",
      i64: "number",
      i128: "bigint",
      bool: "boolean",
      String: "string",
      Address: "string",
      "BytesN<32>": "string | Uint8Array",
      Bytes: "Uint8Array",
      Symbol: "string",
      "Vec<Val>": "unknown[]",
    };

    if (mappings[rustType]) {
      return mappings[rustType];
    }

    if (rustType.startsWith("Vec<")) {
      const innerType = rustType.slice(4, -1);
      return `readonly ${this.toTypeScript(innerType)}[]`;
    }

    if (rustType.startsWith("Option<")) {
      const innerType = rustType.slice(7, -1);
      return `${this.toTypeScript(innerType)} | null`;
    }

    if (rustType.startsWith("Result<")) {
      const match = rustType.match(/Result<([^,>]+),/);
      if (match) {
        return this.toTypeScript(match[1]);
      }
    }

    if (rustType.includes("::")) {
      return rustType.split("::").pop();
    }

    return rustType;
  }

  static toPascalCase(snakeCase) {
    return snakeCase
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("");
  }

  static toCamelCase(snakeCase) {
    const pascal = this.toPascalCase(snakeCase);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }
}

class TypeScriptGenerator {
  generateContractTypes(contractName, metadata) {
    const parts = [];

    parts.push(this.generateImports());
    parts.push(this.generateNamespaceStart(contractName));
    parts.push(this.generateStructTypes(metadata.structs));
    parts.push(this.generateEnumTypes(metadata.enums));
    parts.push(this.generateErrorTypes(metadata.errors));
    parts.push(this.generateMethodInputTypes(metadata.methods));
    parts.push(this.generateContractInterface(metadata.methods));
    parts.push(this.generateNamespaceEnd());

    return parts.filter(Boolean).join("\n\n");
  }

  generateImports() {
    return `import type { InvokeOptions, WriteInvokeOptions, SorobanSubmitResult } from '../types';`;
  }

  generateNamespaceStart(contractName) {
    return `export namespace ${TypeMapper.toPascalCase(contractName)} {`;
  }

  generateNamespaceEnd() {
    return "}";
  }

  generateStructTypes(structs) {
    if (structs.length === 0) return "";

    return structs
      .map((struct) => {
        const fields = struct.fields
          .map((field) => {
            const tsType = TypeMapper.toTypeScript(field.type);
            const optional = field.optional ? "?" : "";
            return `    readonly ${field.name}${optional}: ${tsType};`;
          })
          .join("\n");

        return `  export interface ${struct.name} {\n${fields}\n  }`;
      })
      .join("\n\n");
  }

  generateEnumTypes(enums) {
    if (enums.length === 0) return "";

    return enums
      .map((enumDef) => {
        const variants = enumDef.variants
          .map((variant) => {
            if (variant.dataType) {
              const tsType = TypeMapper.toTypeScript(variant.dataType);
              return `    | { type: '${variant.name}'; value: ${tsType} }`;
            }
            return `    | { type: '${variant.name}' }`;
          })
          .join("\n");

        return `  export type ${enumDef.name} =\n${variants};`;
      })
      .join("\n\n");
  }

  generateErrorTypes(errors) {
    if (errors.length === 0) return "";

    const errorEnum = errors
      .map((error) => `    ${error.name} = ${error.code},`)
      .join("\n");

    const errorMessages = errors
      .map((error) => `    [ErrorCode.${error.name}]: '${error.message}',`)
      .join("\n");

    return (
      `  export enum ErrorCode {\n${errorEnum}\n  }\n\n` +
      `  export const ERROR_MESSAGES: Record<ErrorCode, string> = {\n${errorMessages}\n  };`
    );
  }

  generateMethodInputTypes(methods) {
    const methodInputs = methods
      .filter((m) => m.args.length > 0)
      .map((method) => {
        const fields = method.args
          .map((arg) => {
            const tsType = TypeMapper.toTypeScript(arg.type);
            const optional = arg.optional ? "?" : "";
            return `    readonly ${arg.name}${optional}: ${tsType};`;
          })
          .join("\n");

        const typeName = `${TypeMapper.toPascalCase(method.name)}Input`;
        return `  export interface ${typeName} {\n${fields}\n  }`;
      });

    return methodInputs.join("\n\n");
  }

  generateMethodSignature(method) {
    const returnType = TypeMapper.toTypeScript(method.returnType);
    const inputParam =
      method.args.length > 0
        ? `input: ${TypeMapper.toPascalCase(method.name)}Input, `
        : "";

    const optionsType = method.isReadOnly
      ? "InvokeOptions"
      : "WriteInvokeOptions";
    const optionsParam = `options${method.isReadOnly ? "?" : ""}: ${optionsType}`;

    const promiseReturn = method.isReadOnly
      ? `Promise<${returnType}>`
      : "Promise<SorobanSubmitResult>";

    return `    ${method.name}(${inputParam}${optionsParam}): ${promiseReturn};`;
  }

  generateContractInterface(methods) {
    const methodSignatures = methods
      .map((m) => this.generateMethodSignature(m))
      .join("\n");

    return `  export interface Contract {\n${methodSignatures}\n  }`;
  }
}

function generateTypes() {
  console.log("Generating enhanced TypeScript types...\n");

  fs.mkdirSync(outputDir, { recursive: true });

  const generator = new TypeScriptGenerator();
  const contractMetadata = {};

  for (const contract of CONTRACTS) {
    const filePath = path.resolve(contractRoot, contract.path);
    const source = fs.readFileSync(filePath, "utf8");

    const parser = new RustTypeParser(source);
    const metadata = parser.parseAll();

    contractMetadata[contract.name] = metadata;

    const typeContent = generator.generateContractTypes(
      contract.name,
      metadata,
    );
    const outputFile = path.resolve(outputDir, `${contract.name}.ts`);

    fs.writeFileSync(outputFile, typeContent);
    console.log(`✓ Generated types for ${contract.name}`);
  }

  const indexContent =
    CONTRACTS.map((c) => `export * from './${c.name}';`).join("\n") +
    "\n\nexport type ContractName = " +
    CONTRACTS.map((c) => `'${c.name}'`).join(" | ") +
    ";\n";

  fs.writeFileSync(path.resolve(outputDir, "index.ts"), indexContent);
  console.log("✓ Generated index file");

  const metadataFile = path.resolve(outputDir, "metadata.json");
  fs.writeFileSync(metadataFile, JSON.stringify(contractMetadata, null, 2));
  console.log("✓ Generated metadata file");

  console.log("\nType generation complete!");
}

generateTypes();
