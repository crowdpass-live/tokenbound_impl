import { nativeToScVal } from "@stellar/stellar-base";
import type { InvokeOptions, WriteInvokeOptions } from "../types";

export interface ContractCallStep<TInput, TOutput> {
  readonly input: TInput;
  readonly options?: InvokeOptions | WriteInvokeOptions;
}

export class ContractCallBuilder<TInput = unknown, TOutput = unknown> {
  private _input?: TInput;
  private _options?: InvokeOptions | WriteInvokeOptions;
  private _validators: Array<(input: TInput) => void> = [];

  withInput(input: TInput): this {
    this._input = input;
    return this;
  }

  withOptions(options: InvokeOptions | WriteInvokeOptions): this {
    this._options = options;
    return this;
  }

  withValidator(validator: (input: TInput) => void): this {
    this._validators.push(validator);
    return this;
  }

  validate(): void {
    if (!this._input) {
      throw new Error("Input is required");
    }

    for (const validator of this._validators) {
      validator(this._input);
    }
  }

  build(): ContractCallStep<TInput, TOutput> {
    this.validate();

    return {
      input: this._input!,
      options: this._options,
    };
  }

  get input(): TInput | undefined {
    return this._input;
  }

  get options(): InvokeOptions | WriteInvokeOptions | undefined {
    return this._options;
  }
}

export function createCallBuilder<TInput, TOutput>(): ContractCallBuilder<
  TInput,
  TOutput
> {
  return new ContractCallBuilder<TInput, TOutput>();
}

export class BatchCallBuilder {
  private calls: Array<ContractCallStep<unknown, unknown>> = [];

  add<TInput, TOutput>(call: ContractCallStep<TInput, TOutput>): this {
    this.calls.push(call);
    return this;
  }

  addBuilder<TInput, TOutput>(
    builder: ContractCallBuilder<TInput, TOutput>,
  ): this {
    this.calls.push(builder.build());
    return this;
  }

  build(): readonly ContractCallStep<unknown, unknown>[] {
    return this.calls;
  }

  get length(): number {
    return this.calls.length;
  }

  clear(): this {
    this.calls = [];
    return this;
  }
}

export function createBatchBuilder(): BatchCallBuilder {
  return new BatchCallBuilder();
}
