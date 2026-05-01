"use client";

import { useCallback } from "react";
import {
  useSorobanContractRead,
  useSorobanContractWrite,
} from "./useSorobanContract";
import type {
  CreateAccountInput,
  ExecuteTbaCallInput,
  WriteInvokeOptions,
  InvokeOptions,
} from "../sdk/src/types";

export function useGetTBAAccount(
  sdk: any,
  input: CreateAccountInput,
  options?: InvokeOptions & { enabled?: boolean },
) {
  const contractFn = useCallback(
    (opts?: InvokeOptions) => sdk?.tbaRegistry.getAccount(input, opts),
    [sdk, input],
  );

  return useSorobanContractRead<string>(contractFn, options);
}

export function useCreateTBAAccount(
  sdk: any,
  input: CreateAccountInput,
  options: WriteInvokeOptions,
) {
  const contractFn = useCallback(
    (inp: CreateAccountInput, opts: WriteInvokeOptions) =>
      sdk?.tbaRegistry.createAccount(inp, opts),
    [sdk],
  );

  return useSorobanContractWrite(contractFn, input, options);
}

export function useTBAOwner(
  sdk: any,
  options?: InvokeOptions & { enabled?: boolean },
) {
  const contractFn = useCallback(
    (opts?: InvokeOptions) => sdk?.tbaAccount.owner(opts),
    [sdk],
  );

  return useSorobanContractRead<string>(contractFn, options);
}

export function useTBATokenInfo(
  sdk: any,
  options?: InvokeOptions & { enabled?: boolean },
) {
  const contractFn = useCallback(
    (opts?: InvokeOptions) => sdk?.tbaAccount.token(opts),
    [sdk],
  );

  return useSorobanContractRead<[number, string, bigint]>(contractFn, options);
}

export function useTBANonce(
  sdk: any,
  options?: InvokeOptions & { enabled?: boolean },
) {
  const contractFn = useCallback(
    (opts?: InvokeOptions) => sdk?.tbaAccount.nonce(opts),
    [sdk],
  );

  return useSorobanContractRead<number>(contractFn, options);
}

export function useExecuteTBACall(
  sdk: any,
  input: ExecuteTbaCallInput,
  options: WriteInvokeOptions,
) {
  const contractFn = useCallback(
    (inp: ExecuteTbaCallInput, opts: WriteInvokeOptions) =>
      sdk?.tbaAccount.execute(inp, opts),
    [sdk],
  );

  return useSorobanContractWrite(contractFn, input, options);
}
