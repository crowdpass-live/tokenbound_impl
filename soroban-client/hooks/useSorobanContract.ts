"use client";

import { useState, useCallback, useEffect } from "react";
import type {
  InvokeOptions,
  WriteInvokeOptions,
  SorobanSubmitResult,
} from "../sdk/src/types";

export interface ContractCallState<T = unknown> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  isSuccess: boolean;
  isError: boolean;
}

export interface UseContractReadResult<T> extends ContractCallState<T> {
  refetch: () => Promise<void>;
}

export interface UseContractWriteResult<
  T = SorobanSubmitResult,
> extends ContractCallState<T> {
  write: () => Promise<void>;
  reset: () => void;
}

export function useSorobanContractRead<T>(
  contractFn: ((options?: InvokeOptions) => Promise<T>) | null,
  options?: InvokeOptions & { enabled?: boolean; refetchInterval?: number },
): UseContractReadResult<T> {
  const { enabled = true, refetchInterval, ...invokeOptions } = options || {};

  const [state, setState] = useState<ContractCallState<T>>({
    data: null,
    loading: false,
    error: null,
    isSuccess: false,
    isError: false,
  });

  const fetchData = useCallback(async () => {
    if (!contractFn || !enabled) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const result = await contractFn(invokeOptions);
      setState({
        data: result,
        loading: false,
        error: null,
        isSuccess: true,
        isError: false,
      });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error : new Error("Unknown error"),
        isSuccess: false,
        isError: true,
      });
    }
  }, [contractFn, enabled, invokeOptions]);

  useEffect(() => {
    if (enabled) {
      void fetchData();
    }
  }, [fetchData, enabled]);

  useEffect(() => {
    if (!refetchInterval || !enabled) return;

    const interval = setInterval(() => {
      void fetchData();
    }, refetchInterval);

    return () => clearInterval(interval);
  }, [refetchInterval, enabled, fetchData]);

  return {
    ...state,
    refetch: fetchData,
  };
}

export function useSorobanContractWrite<
  TInput = unknown,
  TOutput = SorobanSubmitResult,
>(
  contractFn:
    | ((input: TInput, options: WriteInvokeOptions) => Promise<TOutput>)
    | null,
  input: TInput,
  options: WriteInvokeOptions,
): UseContractWriteResult<TOutput> {
  const [state, setState] = useState<ContractCallState<TOutput>>({
    data: null,
    loading: false,
    error: null,
    isSuccess: false,
    isError: false,
  });

  const write = useCallback(async () => {
    if (!contractFn) {
      setState((prev) => ({
        ...prev,
        error: new Error("Contract function not provided"),
        isError: true,
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const result = await contractFn(input, options);
      setState({
        data: result,
        loading: false,
        error: null,
        isSuccess: true,
        isError: false,
      });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error : new Error("Unknown error"),
        isSuccess: false,
        isError: true,
      });
    }
  }, [contractFn, input, options]);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      isSuccess: false,
      isError: false,
    });
  }, []);

  return {
    ...state,
    write,
    reset,
  };
}
