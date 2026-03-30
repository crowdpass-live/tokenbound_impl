"use client";

import React, { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { type Event, getTokenId } from "@/lib/soroban";
import { X, ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";
import { signMessage } from "@stellar/freighter-api";

interface TicketQRModalProps {
  event: Event;
  address: string;
  onClose: () => void;
}

export default function TicketQRModal({ event, address, onClose }: TicketQRModalProps) {
  const [tokenId, setTokenId] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(true);

  const [signature, setSignature] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    getTokenId(event.ticket_nft_addr, address)
      .then(setTokenId)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [event.ticket_nft_addr, address]);

  const handleSign = async () => {
    setSigning(true);
    try {
      const message = `Verify Ticket: token_id:${tokenId}, event:${event.id}, owner:${address}`;
      const sig = await signMessage(message, { address });
      setSignature((sig as any).signedMessage || sig);
    } catch (err) {
      console.error("Signing failed", err);
      alert("Failed to sign message. Verification might fail.");
    } finally {
      setSigning(false);
    }
  };

  const qrData = JSON.stringify({
    t: tokenId?.toString() || "0",
    e: event.id,
    o: address,
    c: event.ticket_nft_addr,
    sig: signature,
    ts: Math.floor(Date.now() / 1000)
  });

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-[32px] bg-[#27272A] p-8 shadow-2xl border border-white/10">
        <button
          onClick={onClose}
          className="absolute right-6 top-6 text-gray-400 hover:text-white transition"
        >
          <X size={24} />
        </button>

        <div className="flex flex-col items-center text-center space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">{event.theme}</h2>
            <p className="text-gray-400 text-sm">Scan to verify your ticket at entry</p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-inner ring-4 ring-white/5 relative">
            {loading ? (
              <div className="w-[200px] h-[200px] flex items-center justify-center">
                <Loader2 className="animate-spin text-slate-800" size={32} />
              </div>
            ) : (
              <>
                <QRCode
                  size={200}
                  value={qrData}
                  viewBox={`0 0 256 256`}
                  style={{ height: "auto", maxWidth: "100%", width: "100%", opacity: signature ? 1 : 0.3 }}
                />
                {!signature && (
                  <div className="absolute inset-0 flex items-center justify-center p-4">
                    <button
                      onClick={handleSign}
                      disabled={signing}
                      className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-xl hover:bg-slate-800 transition disabled:opacity-50"
                    >
                      {signing ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
                      {signing ? "Signing..." : "Generate Verified QR"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {signature ? (
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
               <ShieldCheck size={14} /> Cryptographically Signed
            </div>
          ) : (
            <div className="flex items-center gap-2 text-amber-400 text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">
               <ShieldAlert size={14} /> Unverified QR Code
            </div>
          )}

          <div className="w-full space-y-3 pt-4">
             <div className="flex justify-between text-xs font-mono text-gray-500 border-b border-white/5 pb-2">
                <span>Token ID</span>
                <span className="text-gray-300">#{tokenId?.toString() || "..."}</span>
             </div>
             <div className="flex justify-between text-xs font-mono text-gray-500 border-b border-white/5 pb-2">
                <span>Event ID</span>
                <span className="text-gray-300">{event.id}</span>
             </div>
             <div className="flex justify-between text-xs font-mono text-gray-500">
                <span>Owner</span>
                <span className="text-gray-300 truncate ml-4" title={address}>
                  {address.substring(0, 8)}...{address.slice(-8)}
                </span>
             </div>
          </div>
          
          <p className="text-[10px] text-gray-500 uppercase tracking-widest pt-2">
            Valid Ticket Signature Included
          </p>
        </div>
      </div>
    </div>
  );
}
