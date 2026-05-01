"use client";

import { useCallback } from "react";
import {
  useSorobanContractRead,
  useSorobanContractWrite,
} from "./useSorobanContract";
import type { WriteInvokeOptions, InvokeOptions } from "../sdk/src/types";

export function useOwnerOf(
  sdk: any,
  tokenId: bigint,
  options?: InvokeOptions & { enabled?: boolean },
) {
  const contractFn = useCallback(
    (opts?: InvokeOptions) => sdk?.ticketNft.ownerOf(tokenId, opts),
    [sdk, tokenId],
  );

  return useSorobanContractRead<string>(contractFn, options);
}

export function useBalanceOf(
  sdk: any,
  owner: string,
  options?: InvokeOptions & { enabled?: boolean },
) {
  const contractFn = useCallback(
    (opts?: InvokeOptions) => sdk?.ticketNft.balanceOf(owner, opts),
    [sdk, owner],
  );

  return useSorobanContractRead<bigint>(contractFn, options);
}

export function useIsValid(
  sdk: any,
  tokenId: bigint,
  options?: InvokeOptions & { enabled?: boolean },
) {
  const contractFn = useCallback(
    (opts?: InvokeOptions) => sdk?.ticketNft.isValid(tokenId, opts),
    [sdk, tokenId],
  );

  return useSorobanContractRead<boolean>(contractFn, options);
}

export function useTransferNFT(
  sdk: any,
  from: string,
  to: string,
  tokenId: bigint,
  options: WriteInvokeOptions,
) {
  const contractFn = useCallback(
    (
      input: { from: string; to: string; tokenId: bigint },
      opts: WriteInvokeOptions,
    ) => sdk?.ticketNft.transferFrom(input.from, input.to, input.tokenId, opts),
    [sdk],
  );

  return useSorobanContractWrite(contractFn, { from, to, tokenId }, options);
}

export function useBurnTicket(
  sdk: any,
  tokenId: bigint,
  options: WriteInvokeOptions,
) {
  const contractFn = useCallback(
    (id: bigint, opts: WriteInvokeOptions) => sdk?.ticketNft.burn(id, opts),
    [sdk],
  );

  return useSorobanContractWrite(contractFn, tokenId, options);
}
