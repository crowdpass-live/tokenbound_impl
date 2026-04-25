"use client";

import React, { useEffect, useState, useRef } from "react";
import Header from "@/components/Header";
import { Html5QrcodeScanner } from "html5-qrcode";
import { getBalance } from "@/lib/soroban";
const StellarSdk = require("@stellar/stellar-sdk");
import { ShieldCheck, ShieldAlert, Loader2, Camera, User, Ticket } from "lucide-react";

interface TicketData {
  t: string; // token_id
  e: number; // event_id
  o: string; // owner
  c: string; // contract (ticket_nft_addr)
  sig?: string; // signature
  ts: number; // timestamp
}

export default function VerifierPage() {
  const [scanResult, setScanResult] = useState<TicketData | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "verifying" | "valid" | "invalid">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [onChainValid, setOnChainValid] = useState<boolean | null>(null);
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
      verifyTicket(data);
      if (scannerRef.current) {
        // We can pause or stop if we want, but let's just show results
      }
    } catch (e) {
      console.error("Failed to parse QR data", e);
    }
  }

  function onScanFailure(error: any) {
    // console.warn(`Code scan error = ${error}`);
  }

  const verifyTicket = async (data: TicketData) => {
    setVerificationStatus("verifying");
    setErrorMsg("");
    setOnChainValid(null);

    try {
      // 1. Verify Cryptographic Signature if present
      if (data.sig) {
        const message = `Verify Ticket: token_id:${data.t}, event:${data.e}, owner:${data.o}`;
        try {
          const keypair = StellarSdk.Keypair.fromPublicKey(data.o);
          const messageBytes = new TextEncoder().encode(message);
          const sigBytes = Uint8Array.from(atob(data.sig!), c => c.charCodeAt(0));
          const isValidSig = keypair.verify(messageBytes, sigBytes);
          if (!isValidSig) {
            setVerificationStatus("invalid");
            setErrorMsg("Invalid cryptographic signature!");
            return;
          }
        } catch (err) {
          setVerificationStatus("invalid");
          setErrorMsg("Signature verification failed.");
          return;
        }
      }

      // 2. Verify On-Chain Ownership
      try {
        const balance = await getBalance(data.c, data.o);
        if (balance > BigInt(0)) {
          setOnChainValid(true);
          setVerificationStatus(data.sig ? "valid" : "valid"); // Valid but maybe warning if no sig
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

    } catch (err) {
      setVerificationStatus("invalid");
      setErrorMsg("Verification process failed.");
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setVerificationStatus("idle");
    setErrorMsg("");
    setOnChainValid(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 pb-20 pt-36 sm:px-6">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <Camera size={16} /> Organizer Mode
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-white sm:text-5xl">Ticket Verifier</h1>
          <p className="mx-auto max-w-xl text-zinc-500">
            Scan participant QR codes to verify ticket ownership and authenticity via cryptographic signatures and on-chain records.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Scanner Section */}
          <div className="relative overflow-hidden rounded-[40px] border border-zinc-200 bg-white p-4 shadow-2xl shadow-zinc-900/10 dark:border-white/10 dark:bg-zinc-900/50 dark:shadow-sky-500/5 dark:ring-1 dark:ring-white/5">
            <div id="reader" className="overflow-hidden rounded-[32px] bg-black"></div>
            {verificationStatus !== "idle" && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={resetScanner}
                  className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-6 py-3 font-bold text-zinc-900 transition hover:bg-zinc-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                >
                  Scan Next Ticket
                </button>
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className="flex flex-col gap-6">
            {verificationStatus === "idle" ? (
              <div className="flex h-full flex-col items-center justify-center space-y-4 rounded-[40px] border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-800">
                <div className="animate-pulse rounded-full bg-zinc-100 p-6 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-700">
                  <Camera size={48} />
                </div>
                <p className="font-medium italic text-zinc-500">Waiting for scan...</p>
              </div>
            ) : (
              <div className={`flex flex-col rounded-[40px] border p-8 space-y-8 h-full transition-colors duration-500 ${verificationStatus === "valid" ? "bg-emerald-50 border-emerald-500/20 dark:bg-emerald-500/5" :
                  verificationStatus === "invalid" ? "bg-rose-50 border-rose-500/20 dark:bg-rose-500/5" :
                    "bg-white border-zinc-200 dark:bg-zinc-900/50 dark:border-white/10"
                }`}>

                <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-3xl ${verificationStatus === "valid" ? "bg-emerald-500/20 text-emerald-400" :
                      verificationStatus === "invalid" ? "bg-rose-500/20 text-rose-400" :
                        "bg-zinc-100 text-zinc-900 dark:bg-white/10 dark:text-white"
                    }`}>
                    {verificationStatus === "verifying" ? <Loader2 className="animate-spin" size={32} /> :
                      verificationStatus === "valid" ? <ShieldCheck size={32} /> : <ShieldAlert size={32} />}
                  </div>
                  <div>
                    <p className="text-xs uppercase font-bold tracking-[0.2em] text-zinc-500">Verification Status</p>
                    <h2 className={`text-2xl font-bold ${verificationStatus === "valid" ? "text-emerald-400" :
                        verificationStatus === "invalid" ? "text-rose-400" :
                          "text-zinc-950 dark:text-white"
                      }`}>
                      {verificationStatus === "verifying" ? "Analyzing..." :
                        verificationStatus === "valid" ? "Access Granted" : "Access Denied"}
                    </h2>
                  </div>
                </div>

                {errorMsg && (
                  <div className="rounded-2xl border border-rose-500/20 bg-rose-50 p-4 text-sm font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                    {errorMsg}
                  </div>
                )}

                <div className="space-y-4 border-t border-zinc-200 pt-4 dark:border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl bg-zinc-100 p-2 text-zinc-500 dark:bg-white/5"><User size={20} /></div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">TICKET OWNER</span>
                      <span className="font-mono text-xs break-all text-zinc-700 dark:text-zinc-200">{scanResult?.o}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl bg-zinc-100 p-2 text-zinc-500 dark:bg-white/5"><Ticket size={20} /></div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">EVENT / TOKEN</span>
                      <span className="font-medium text-zinc-700 dark:text-zinc-200">Event #{scanResult?.e} • Token #{scanResult?.t}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className={`rounded-3xl border p-4 ${onChainValid === true ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-zinc-100 border-zinc-200 text-zinc-600 dark:bg-zinc-800/50 dark:border-white/5"}`}>
                    <p className="text-[10px] uppercase font-bold mb-1">On-Chain</p>
                    <p className="font-bold">{onChainValid === true ? "Confirmed" : onChainValid === false ? "Failed" : "Checking..."}</p>
                  </div>
                  <div className={`p-4 rounded-3xl border ${scanResult?.sig ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-amber-500/10 border-amber-500/20 text-amber-500"}`}>
                    <p className="text-[10px] uppercase font-bold mb-1">Signature</p>
                    <p className="font-bold">{scanResult?.sig ? "Verified" : "Missing"}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
