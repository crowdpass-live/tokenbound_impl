"use client";
import React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

export default function PartnersSection() {
  const t = useTranslations("partners");

  const partners = [
    { name: "Argent", type: "argent" },
    { name: "Starknet Foundation", type: "foundation" },
    { name: "Starknet", type: "starknet" },
    { name: "Argent", type: "argent" },
    { name: "Starknet Foundation", type: "foundation" },
    { name: "Starknet", type: "starknet" },
    { name: "Argent", type: "argent" },
    { name: "Starknet Foundation", type: "foundation" },
    { name: "Starknet", type: "starknet" },
    { name: "Argent", type: "argent" },
    { name: "Starknet Foundation", type: "foundation" },
    { name: "Starknet", type: "starknet" },
  ];

  return (
    <section className="bg-[#18181B] pb-24 border-t border-gray-800">
      <div className="pt-16 pb-12 text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">{t("title")}</h2>
      </div>
      <div className="w-full bg-[#0d0d10] py-12 overflow-hidden relative flex">
        <style jsx>{`
          @keyframes scroll-marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .animate-marquee {
            animation: scroll-marquee 20s linear infinite;
          }
        `}</style>
        <div className="flex animate-marquee whitespace-nowrap gap-16 md:gap-32 items-center px-4 min-w-full">
          {partners.map((partner, index) => (
            <div key={index} className="flex-shrink-0 flex items-center justify-center">
              {partner.type === "argent" && (
                <Image src="/argent.svg" alt="Argent" width={160} height={50} className="h-10 w-auto" />
              )}
              {partner.type === "foundation" && (
                <div className="bg-white rounded-lg px-4 py-2 flex items-center gap-2 shadow-lg">
                  <div className="bg-[#0c0c4f] rounded-full p-1 w-8 h-8 flex items-center justify-center">
                    <Image src="/starknet.svg" alt="Starknet" width={24} height={24} className="h-4 w-4" />
                  </div>
                  <span className="text-[#0c0c4f] font-bold text-lg">STARKNET</span>
                  <span className="text-[#0c0c4f] text-xs self-end mb-1 ml-0.5 opacity-80">FOUNDATION</span>
                </div>
              )}
              {partner.type === "starknet" && (
                <Image src="/starknet.svg" alt="Starknet" width={50} height={50} className="h-12 w-12" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
