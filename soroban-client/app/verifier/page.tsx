"use client";

import React, { useEffect, useState, useRef } from "react";
import Header from "@/components/Header";
import { Html5QrcodeScanner } from "html5-qrcode";
import { checkInTicket, getBalance, isEventManagerConfigured } from "@/lib/soroban";
import { WalletProvider, useWallet } from "@/contexts/WalletContext";
const StellarSdk = require("@stellar/stellar-sdk");
import { ShieldCheck, ShieldAlert, Loader2, Camera, User, Ticket, LogIn } from "lucide-react";

interface TicketData {
  t: string; // token_id
  e: number; // event_id
  o: string; // owner
  c: string; // contract (ticket_nft_addr)
  sig?: string; // signature
  ts: number; // timestamp
}

function VerifierScanner() {
  const { address, signTransaction, isConnected, connect } = useWallet();
  const [scanResult, setScanResult] = useState<TicketData | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "verifying" | "valid" | "invalid">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [onChainValid, setOnChainValid] = useState<boolean | null>(null);
  const [checkInStatus, setCheckInStatus] = useState<"idle" | "pending" | "done" | "error">("idle");
  const [checkInMsg, setCheckInMsg] = useState("");
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );
    scanner.render(onScanSuccess, onScanFailure);
    scannerRef.current = scanner;

    return () => {
      scanner.clear().catch(console.error);
    };
  }, []);

  async function onScanSuccess(decodedText: string) {
    try {
      const data: TicketData = JSON.parse(decodedText);
      setScanResult(data);
      setCheckInStatus("idle");
      setCheckInMsg("");
      verifyTicket(data);
    } catch (e) {
      console.error("Failed to parse QR data", e);
    }
  }

  function onScanFailure(_error: unknown) {
    // Scanner polls frequently; ignore benign decode errors.
  }

  const verifyTicket = async (data: TicketData) => {
    setVerificationStatus("verifying");
    setErrorMsg("");
    setOnChainValid(null);

    try {
      if (data.sig) {
        const message = `Verify Ticket: token_id:${data.t}, event:${data.e}, owner:${data.o}`;
        try {
          const keypair = StellarSdk.Keypair.fromPublicKey(data.o);
          const messageBytes = new TextEncoder().encode(message);
          const sigBytes = Uint8Array.from(atob(data.sig!), (c) => c.charCodeAt(0));
          const isValidSig = keypair.verify(messageBytes, sigBytes);
          if (!isValidSig) {
            setVerificationStatus("invalid");
            setErrorMsg("Invalid cryptographic signature!");
            return;
          }
        } catch {
          setVerificationStatus("invalid");
          setErrorMsg("Signature verification failed.");
          return;
        }
      }

      try {
        const balance = await getBalance(data.c, data.o);
        if (balance > BigInt(0)) {
          setOnChainValid(true);
          setVerificationStatus("valid");
        } else {
          setOnChainValid(false);
          setVerificationStatus("invalid");
          setErrorMsg("Ticket not owned by this address on-chain!");
        }
      } catch (err) {
        console.error("On-chain check failed", err);
        setErrorMsg("Could not verify on-chain (offline mode?)");
        setVerificationStatus(data.sig ? "valid" : "invalid");
      }
    } catch {
      setVerificationStatus("invalid");
      setErrorMsg("Verification process failed.");
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setVerificationStatus("idle");
    setErrorMsg("");
    setOnChainValid(null);
    setCheckInStatus("idle");
    setCheckInMsg("");
  };

  const submitCheckIn = async () => {
    if (!address || !scanResult) return;
    if (!isEventManagerConfigured()) {
      setCheckInStatus("error");
      setCheckInMsg("Event manager contract is not configured in the environment.");
      return;
    }

    setCheckInStatus("pending");
    setCheckInMsg("");

    try {
      let tokenId: bigint;
      try {
        tokenId = BigInt(scanResult.t);
      } catch {
        setCheckInStatus("error");
        setCheckInMsg("Invalid token id in QR payload.");
        return;
      }

      await checkInTicket(
        { scanner: address, eventId: scanResult.e, tokenId },
        signTransaction
      );
      setCheckInStatus("done");
      setCheckInMsg("Check-in recorded on-chain. Indexers can pick up the contract event.");
    } catch (e: unknown) {
      setCheckInStatus("error");
      const msg = e instanceof Error ? e.message : String(e);
      setCheckInMsg(msg || "Check-in transaction failed.");
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100">
      <Header />

      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 pb-20 pt-36 sm:px-6">
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-400">
            <Camera size={16} /> Organizer / staff scanner
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Ticket Verifier</h1>
          <p className="mx-auto max-w-xl text-zinc-500">
            Scan participant QR codes, verify the ticket on-chain, then record check-in on the event manager contract
            for an immutable attendance log.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="relative overflow-hidden rounded-[40px] border border-white/10 bg-zinc-900/50 p-4 shadow-2xl shadow-sky-500/5 ring-1 ring-white/5">
            <div id="reader" className="overflow-hidden rounded-[32px] bg-black"></div>
            {verificationStatus !== "idle" && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={resetScanner}
                  className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-3 font-bold text-white transition hover:bg-white/10"
                >
                  Scan Next Ticket
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6">
            {verificationStatus === "idle" ? (
              <div className="flex h-full flex-col items-center justify-center space-y-4 rounded-[40px] border border-dashed border-zinc-800 p-12 text-center">
                <div className="animate-pulse rounded-full bg-zinc-900 p-6 text-zinc-700">
                  <Camera size={48} />
                </div>
                <p className="font-medium italic text-zinc-600">Waiting for scan...</p>
              </div>
            ) : (
              <div
                className={`flex h-full flex-col space-y-8 rounded-[40px] border p-8 transition-colors duration-500 ${
                  verificationStatus === "valid"
                    ? "border-emerald-500/20 bg-emerald-500/5"
                    : verificationStatus === "invalid"
                      ? "border-rose-500/20 bg-rose-500/5"
                      : "border-white/10 bg-zinc-900/50"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`rounded-3xl p-4 ${
                      verificationStatus === "valid"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : verificationStatus === "invalid"
                          ? "bg-rose-500/20 text-rose-400"
                          : "bg-white/10 text-white"
                    }`}
                  >
                    {verificationStatus === "verifying" ? (
                      <Loader2 className="animate-spin" size={32} />
                    ) : verificationStatus === "valid" ? (
                      <ShieldCheck size={32} />
                    ) : (
                      <ShieldAlert size={32} />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Verification Status</p>
                    <h2
                      className={`text-2xl font-bold ${
                        verificationStatus === "valid"
                          ? "text-emerald-400"
                          : verificationStatus === "invalid"
                            ? "text-rose-400"
                            : "text-white"
                      }`}
                    >
                      {verificationStatus === "verifying"
                        ? "Analyzing..."
                        : verificationStatus === "valid"
                          ? "Access Granted"
                          : "Access Denied"}
                    </h2>
                  </div>
                </div>

                {errorMsg && (
                  <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm font-medium text-rose-400">
                    {errorMsg}
                  </div>
                )}

                <div className="space-y-4 border-t border-white/5 pt-4">
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl bg-white/5 p-2 text-zinc-500">
                      <User size={20} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">TICKET OWNER</span>
                      <span className="break-all font-mono text-xs text-zinc-200">{scanResult?.o}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl bg-white/5 p-2 text-zinc-500">
                      <Ticket size={20} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                        EVENT / TOKEN
                      </span>
                      <span className="font-medium text-zinc-200">
                        Event #{scanResult?.e} • Token #{scanResult?.t}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div
                    className={`rounded-3xl border p-4 ${
                      onChainValid === true
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                        : "border-white/5 bg-zinc-800/50 text-zinc-600"
                    }`}
                  >
                    <p className="mb-1 text-[10px] font-bold uppercase">On-Chain</p>
                    <p className="font-bold">
                      {onChainValid === true ? "Confirmed" : onChainValid === false ? "Failed" : "Checking..."}
                    </p>
                  </div>
                  <div
                    className={`rounded-3xl border p-4 ${
                      scanResult?.sig
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                        : "border-amber-500/20 bg-amber-500/10 text-amber-500"
                    }`}
                  >
                    <p className="mb-1 text-[10px] font-bold uppercase">Signature</p>
                    <p className="font-bold">{scanResult?.sig ? "Verified" : "Missing"}</p>
                  </div>
                </div>

                {verificationStatus === "valid" && onChainValid === true && isEventManagerConfigured() && (
                  <div className="space-y-3 border-t border-white/5 pt-6">
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">On-chain check-in</p>
                    {!isConnected ? (
                      <button
                        type="button"
                        onClick={() => connect()}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 font-bold text-white hover:bg-sky-500"
                      >
                        <LogIn size={18} /> Connect wallet (organizer or staff)
                      </button>
                    ) : (
                      <>
                        <p className="font-mono text-xs text-zinc-400">Signing as {address}</p>
                        <button
                          type="button"
                          disabled={checkInStatus === "pending"}
                          onClick={submitCheckIn}
                          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 font-bold text-zinc-900 hover:bg-zinc-100 disabled:opacity-50"
                        >
                          {checkInStatus === "pending" ? (
                            <>
                              <Loader2 className="animate-spin" size={18} /> Submitting…
                            </>
                          ) : (
                            "Record check-in on-chain"
                          )}
                        </button>
                      </>
                    )}
                    {checkInMsg && (
                      <p
                        className={`text-sm font-medium ${
                          checkInStatus === "done" ? "text-emerald-400" : checkInStatus === "error" ? "text-rose-400" : "text-zinc-400"
                        }`}
                      >
                        {checkInMsg}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function VerifierPage() {
  return (
    <WalletProvider>
      <VerifierScanner />
    </WalletProvider>
  );
}
