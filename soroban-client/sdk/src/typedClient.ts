import { nativeToScVal } from "@stellar/stellar-base";
import type { SorobanSdkCore } from "./core";
import type {
  ContractCallArtifact,
  InvokeOptions,
  WriteInvokeOptions,
} from "./types";

export interface TypedMethodConfig {
  readonly name: string;
  readonly isReadOnly: boolean;
  readonly argTypes?: readonly string[];
}

export class TypedContractClient<TContract = unknown> {
  protected readonly core: SorobanSdkCore;
  protected readonly contractName: string;
  protected readonly methodConfigs: Map<string, TypedMethodConfig>;

  constructor(
    core: SorobanSdkCore,
    contractName: string,
    methodConfigs: readonly TypedMethodConfig[],
  ) {
    this.core = core;
    this.contractName = contractName;
    this.methodConfigs = new Map(
      methodConfigs.map((config) => [config.name, config]),
    );
  }

  get contractId(): string {
    return this.core.getContractId(this.contractName as any);
  }

  protected createArtifact(
    method: string,
    args: readonly ReturnType<typeof nativeToScVal>[],
  ): ContractCallArtifact {
    return {
      contractId: this.contractId,
      method,
      args,
    };
  }

  protected async read<T>(
    method: string,
    args: readonly ReturnType<typeof nativeToScVal>[],
    options?: InvokeOptions,
  ): Promise<T> {
    const config = this.methodConfigs.get(method);
    if (!config?.isReadOnly) {
      throw new Error(`Method ${method} is not a read-only method`);
    }

    return this.core.read<T>(
      this.contractName as any,
      this.createArtifact(method, args),
      options,
    );
  }

  protected async write(
    method: string,
    args: readonly ReturnType<typeof nativeToScVal>[],
    options: WriteInvokeOptions,
  ) {
    const config = this.methodConfigs.get(method);
    if (config?.isReadOnly) {
      throw new Error(
        `Method ${method} is a read-only method, use read() instead`,
      );
    }

    return this.core.write(
      this.contractName as any,
      this.createArtifact(method, args),
      options,
    );
  }

  async prepare(
    method: string,
    args: readonly ReturnType<typeof nativeToScVal>[],
    options: WriteInvokeOptions,
  ) {
    return this.core.prepareWrite(
      this.contractName as any,
      this.createArtifact(method, args),
      options,
    );
  }

  getMethodConfig(method: string): TypedMethodConfig | undefined {
    return this.methodConfigs.get(method);
  }

  listMethods(): readonly string[] {
    return Array.from(this.methodConfigs.keys());
  }

  listReadMethods(): readonly string[] {
    return Array.from(this.methodConfigs.values())
      .filter((config) => config.isReadOnly)
      .map((config) => config.name);
  }

  listWriteMethods(): readonly string[] {
    return Array.from(this.methodConfigs.values())
      .filter((config) => !config.isReadOnly)
      .map((config) => config.name);
  }
}

export function createTypedClient<TContract>(
  core: SorobanSdkCore,
  contractName: string,
  methodConfigs: readonly TypedMethodConfig[],
): TypedContractClient<TContract> {
  return new TypedContractClient<TContract>(core, contractName, methodConfigs);
}
