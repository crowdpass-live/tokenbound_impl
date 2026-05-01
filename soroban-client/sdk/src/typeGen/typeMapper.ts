import type { TypeMapping } from "./types";

export class TypeMapper {
  private static readonly mappings: readonly TypeMapping[] = [
    { rust: "u32", typescript: "number", scValType: "u32" },
    { rust: "u64", typescript: "number", scValType: "u64" },
    { rust: "u128", typescript: "bigint", scValType: "u128" },
    { rust: "i32", typescript: "number", scValType: "i32" },
    { rust: "i64", typescript: "number", scValType: "i64" },
    { rust: "i128", typescript: "bigint", scValType: "i128" },
    { rust: "bool", typescript: "boolean", scValType: "bool" },
    { rust: "String", typescript: "string", scValType: "string" },
    { rust: "Address", typescript: "string", scValType: "address" },
    {
      rust: "BytesN<32>",
      typescript: "string | Uint8Array",
      scValType: "bytes",
    },
    { rust: "Bytes", typescript: "Uint8Array", scValType: "bytes" },
    { rust: "Symbol", typescript: "string", scValType: "symbol" },
    { rust: "Vec<Val>", typescript: "unknown[]", scValType: "vec" },
  ];

  static toTypeScript(rustType: string): string {
    for (const mapping of this.mappings) {
      if (rustType === mapping.rust) {
        return mapping.typescript;
      }
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
      return rustType.split("::").pop() || rustType;
    }

    return rustType;
  }

  static getScValType(rustType: string): string | undefined {
    for (const mapping of this.mappings) {
      if (rustType === mapping.rust) {
        return mapping.scValType;
      }
    }

    if (rustType.startsWith("Vec<")) {
      return "vec";
    }

    if (rustType.startsWith("Option<")) {
      const innerType = rustType.slice(7, -1);
      return this.getScValType(innerType);
    }

    return undefined;
  }

  static toCamelCase(snakeCase: string): string {
    return snakeCase.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  static toPascalCase(snakeCase: string): string {
    const camel = this.toCamelCase(snakeCase);
    return camel.charAt(0).toUpperCase() + camel.slice(1);
  }

  static toSnakeCase(camelCase: string): string {
    return camelCase.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}
