import type {
  ParsedMethod,
  ParsedError,
  ParsedStruct,
  ParsedEnum,
  ContractMetadata,
} from "./types";

export class RustContractParser {
  private source: string;

  constructor(source: string) {
    this.source = source;
  }

  parseAll(): ContractMetadata {
    return {
      methods: this.parseMethods(),
      errors: this.parseErrors(),
      structs: this.parseStructs(),
      enums: this.parseEnums(),
    };
  }

  parseMethods(): ParsedMethod[] {
    const methodRegex =
      /pub fn ([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\)\s*(?:->\s*([^{]+))?\s*\{/g;
    const methods: ParsedMethod[] = [];

    for (const match of this.source.matchAll(methodRegex)) {
      const [, name, rawArgs, rawReturn] = match;

      const args = this.parseMethodArgs(rawArgs);
      const returnType = this.normalizeType(rawReturn || "()");

      methods.push({
        name,
        args,
        returnType,
        isReadOnly: this.isReadOnlyMethod(name),
        documentation: this.extractDocumentation(name),
      });
    }

    return methods;
  }

  private parseMethodArgs(
    rawArgs: string,
  ): Array<{ name: string; type: string; optional: boolean }> {
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

  parseErrors(): ParsedError[] {
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

  parseStructs(): ParsedStruct[] {
    const structRegex =
      /#\[contracttype\][\s\S]*?pub struct ([a-zA-Z0-9_]+)\s*\{([\s\S]*?)\n\}/g;
    const structs: ParsedStruct[] = [];

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

  parseEnums(): ParsedEnum[] {
    const enumRegex =
      /#\[contracttype\][\s\S]*?pub enum ([a-zA-Z0-9_]+)\s*\{([\s\S]*?)\n\}/g;
    const enums: ParsedEnum[] = [];

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
          return { name: cleaned, dataType: undefined };
        });

      enums.push({ name, variants });
    }

    return enums;
  }

  private normalizeType(rustType: string): string {
    return rustType
      .replace(/\s+/g, " ")
      .replace(/Result<([^,>]+),[^>]+>/g, "$1")
      .replace(/Option<([^>]+)>/g, "$1 | null")
      .trim();
  }

  private isReadOnlyMethod(name: string): boolean {
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

  private extractDocumentation(methodName: string): string | undefined {
    const docRegex = new RegExp(
      `///\\s*([^\\n]+)\\s*\\n[\\s\\S]*?pub fn ${methodName}`,
      "g",
    );
    const match = docRegex.exec(this.source);
    return match ? match[1].trim() : undefined;
  }

  private generateErrorMessage(errorName: string): string {
    return errorName
      .replace(/([A-Z])/g, " $1")
      .trim()
      .toLowerCase();
  }
}
