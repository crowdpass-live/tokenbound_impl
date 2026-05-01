"use client";

import { useCallback } from "react";
import {
  useSorobanContractRead,
  useSorobanContractWrite,
} from "./useSorobanContract";
import type {
  CreateEventInput,
  EventRecord,
  UpdateEventInput,
  PurchaseTicketInput,
  WriteInvokeOptions,
  InvokeOptions,
} from "../sdk/src/types";

export function useGetEvent(
  sdk: any,
  eventId: number,
  options?: InvokeOptions & { enabled?: boolean },
) {
  const contractFn = useCallback(
    (opts?: InvokeOptions) => sdk?.eventManager.getEvent(eventId, opts),
    [sdk, eventId],
  );

  return useSorobanContractRead<EventRecord>(contractFn, options);
}

export function useGetAllEvents(
  sdk: any,
  options?: InvokeOptions & { enabled?: boolean; refetchInterval?: number },
) {
  const contractFn = useCallback(
    (opts?: InvokeOptions) => sdk?.eventManager.getAllEvents(opts),
    [sdk],
  );

  return useSorobanContractRead<EventRecord[]>(contractFn, options);
}

export function useGetEventCount(
  sdk: any,
  options?: InvokeOptions & { enabled?: boolean },
) {
  const contractFn = useCallback(
    (opts?: InvokeOptions) => sdk?.eventManager.getEventCount(opts),
    [sdk],
  );

  return useSorobanContractRead<number>(contractFn, options);
}

export function useCreateEvent(
  sdk: any,
  input: CreateEventInput,
  options: WriteInvokeOptions,
) {
  const contractFn = useCallback(
    (inp: CreateEventInput, opts: WriteInvokeOptions) =>
      sdk?.eventManager.createEvent(inp, opts),
    [sdk],
  );

  return useSorobanContractWrite(contractFn, input, options);
}

export function useUpdateEvent(
  sdk: any,
  input: UpdateEventInput,
  options: WriteInvokeOptions,
) {
  const contractFn = useCallback(
    (inp: UpdateEventInput, opts: WriteInvokeOptions) =>
      sdk?.eventManager.updateEvent(inp, opts),
    [sdk],
  );

  return useSorobanContractWrite(contractFn, input, options);
}

export function useCancelEvent(
  sdk: any,
  eventId: number,
  options: WriteInvokeOptions,
) {
  const contractFn = useCallback(
    (_: number, opts: WriteInvokeOptions) =>
      sdk?.eventManager.cancelEvent(eventId, opts),
    [sdk, eventId],
  );

  return useSorobanContractWrite(contractFn, eventId, options);
}

export function usePurchaseTicket(
  sdk: any,
  input: PurchaseTicketInput,
  options: WriteInvokeOptions,
) {
  const contractFn = useCallback(
    (inp: PurchaseTicketInput, opts: WriteInvokeOptions) =>
      sdk?.eventManager.purchaseTicket(inp, opts),
    [sdk],
  );

  return useSorobanContractWrite(contractFn, input, options);
}

export function useClaimRefund(
  sdk: any,
  claimer: string,
  eventId: number,
  options: WriteInvokeOptions,
) {
  const contractFn = useCallback(
    (_: { claimer: string; eventId: number }, opts: WriteInvokeOptions) =>
      sdk?.eventManager.claimRefund(claimer, eventId, opts),
    [sdk, claimer, eventId],
  );

  return useSorobanContractWrite(contractFn, { claimer, eventId }, options);
}

export function useGetBuyerPurchase(
  sdk: any,
  eventId: number,
  buyer: string,
  options?: InvokeOptions & { enabled?: boolean },
) {
  const contractFn = useCallback(
    (opts?: InvokeOptions) =>
      sdk?.eventManager.getBuyerPurchase(eventId, buyer, opts),
    [sdk, eventId, buyer],
  );

  return useSorobanContractRead(contractFn, options);
}
