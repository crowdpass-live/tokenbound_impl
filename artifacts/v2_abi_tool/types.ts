export interface ParsedMethod {
  readonly name: string;
  readonly args: readonly ParsedMethodArg[];
  readonly returnType: string;
  readonly isReadOnly: boolean;
  readonly documentation?: string;
}

export interface ParsedMethodArg {
  readonly name: string;
  readonly type: string;
  readonly optional: boolean;
}

export interface ParsedError {
  readonly name: string;
  readonly code: number;
  readonly message: string;
}

export interface ParsedStruct {
  readonly name: string;
  readonly fields: readonly ParsedField[];
}

export interface ParsedField {
  readonly name: string;
  readonly type: string;
  readonly optional: boolean;
}

export interface ParsedEnum {
  readonly name: string;
  readonly variants: readonly ParsedVariant[];
}

export interface ParsedVariant {
  readonly name: string;
  readonly dataType?: string;
}

export interface ContractMetadata {
  readonly methods: readonly ParsedMethod[];
  readonly errors: readonly ParsedError[];
  readonly structs: readonly ParsedStruct[];
  readonly enums: readonly ParsedEnum[];
}

export interface TypeMapping {
  readonly rust: string;
  readonly typescript: string;
  readonly scValType?: string;
}

export interface GeneratedContract {
  readonly name: string;
  readonly metadata: ContractMetadata;
  readonly sourcePath: string;
}
