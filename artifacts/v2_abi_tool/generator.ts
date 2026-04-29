import type {
  ContractMetadata,
  ParsedMethod,
  ParsedStruct,
  ParsedEnum,
  ParsedError,
} from "./types";
import { TypeMapper } from "./typeMapper";

export class TypeScriptGenerator {
  private indent = "  ";

  generateContractTypes(
    contractName: string,
    metadata: ContractMetadata,
  ): string {
    const parts: string[] = [];

    parts.push(this.generateHeader(contractName));
    parts.push(this.generateStructTypes(metadata.structs));
    parts.push(this.generateEnumTypes(metadata.enums));
    parts.push(this.generateErrorTypes(metadata.errors));
    parts.push(this.generateMethodTypes(contractName, metadata.methods));
    parts.push(this.generateContractInterface(contractName, metadata.methods));

    return parts.filter(Boolean).join("\n\n");
  }

  private generateHeader(contractName: string): string {
    return `export namespace ${TypeMapper.toPascalCase(contractName)} {`;
  }

  private generateStructTypes(structs: readonly ParsedStruct[]): string {
    if (structs.length === 0) return "";

    return structs
      .map((struct) => {
        const fields = struct.fields
          .map((field) => {
            const tsType = TypeMapper.toTypeScript(field.type);
            const optional = field.optional ? "?" : "";
            return `${this.indent}${this.indent}readonly ${field.name}${optional}: ${tsType};`;
          })
          .join("\n");

        return `${this.indent}export interface ${struct.name} {\n${fields}\n${this.indent}}`;
      })
      .join("\n\n");
  }

  private generateEnumTypes(enums: readonly ParsedEnum[]): string {
    if (enums.length === 0) return "";

    return enums
      .map((enumDef) => {
        const variants = enumDef.variants
          .map((variant) => {
            if (variant.dataType) {
              const tsType = TypeMapper.toTypeScript(variant.dataType);
              return `${this.indent}${this.indent}| { type: '${variant.name}'; value: ${tsType} }`;
            }
            return `${this.indent}${this.indent}| { type: '${variant.name}' }`;
          })
          .join("\n");

        return `${this.indent}export type ${enumDef.name} =\n${variants};`;
      })
      .join("\n\n");
  }

  private generateErrorTypes(errors: readonly ParsedError[]): string {
    if (errors.length === 0) return "";

    const errorEnum = errors
      .map(
        (error) => `${this.indent}${this.indent}${error.name} = ${error.code},`,
      )
      .join("\n");

    const errorMessages = errors
      .map(
        (error) =>
          `${this.indent}${this.indent}[ErrorCode.${error.name}]: '${error.message}',`,
      )
      .join("\n");

    return (
      `${this.indent}export enum ErrorCode {\n${errorEnum}\n${this.indent}}\n\n` +
      `${this.indent}export const ERROR_MESSAGES: Record<ErrorCode, string> = {\n${errorMessages}\n${this.indent}};`
    );
  }

  private generateMethodTypes(
    contractName: string,
    methods: readonly ParsedMethod[],
  ): string {
    const methodInputs = methods
      .filter((m) => m.args.length > 0)
      .map((method) => {
        const fields = method.args
          .map((arg) => {
            const tsType = TypeMapper.toTypeScript(arg.type);
            const optional = arg.optional ? "?" : "";
            return `${this.indent}${this.indent}readonly ${arg.name}${optional}: ${tsType};`;
          })
          .join("\n");

        const typeName = `${TypeMapper.toPascalCase(method.name)}Input`;
        return `${this.indent}export interface ${typeName} {\n${fields}\n${this.indent}}`;
      });

    return methodInputs.join("\n\n");
  }

  private generateMethodSignature(method: ParsedMethod): string {
    const returnType = TypeMapper.toTypeScript(method.returnType);
    const inputType =
      method.args.length > 0
        ? `input: ${TypeMapper.toPascalCase(method.name)}Input`
        : "";

    const optionsType = method.isReadOnly
      ? "InvokeOptions"
      : "WriteInvokeOptions";
    const params = [
      inputType,
      `options${method.isReadOnly ? "?" : ""}: ${optionsType}`,
    ]
      .filter(Boolean)
      .join(", ");

    const promiseReturn = method.isReadOnly
      ? `Promise<${returnType}>`
      : "Promise<SorobanSubmitResult>";

    return `${this.indent}${this.indent}${method.name}(${params}): ${promiseReturn};`;
  }

  private generateContractInterface(
    contractName: string,
    methods: readonly ParsedMethod[],
  ): string {
    const methodSignatures = methods
      .map((m) => this.generateMethodSignature(m))
      .join("\n");

    return `${this.indent}export interface Contract {\n${methodSignatures}\n${this.indent}}\n}`;
  }

  generateIndexFile(contractNames: readonly string[]): string {
    const exports = contractNames
      .map((name) => `export * from './${name}';`)
      .join("\n");

    return `${exports}\n\nexport type ContractName = ${contractNames.map((n) => `'${n}'`).join(" | ")};\n`;
  }
}
