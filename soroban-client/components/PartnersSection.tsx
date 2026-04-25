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
    <section className="border-t border-zinc-200 bg-background pb-24 dark:border-gray-800">
      <div className="pt-16 pb-12 text-center">
        <h2 className="mb-8 text-4xl font-bold text-zinc-950 dark:text-white md:text-5xl">{t("title")}</h2>
      </div>
      <div className="relative flex w-full overflow-hidden bg-zinc-950 py-12 dark:bg-[#0d0d10]">
        <style jsx>{`
          @keyframes scroll-marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .animate-marquee {
            animation: scroll-marquee 20s linear infinite;
          }
        `}</style>
        <div className="flex min-w-full animate-marquee items-center gap-16 whitespace-nowrap px-4 md:gap-32">
          {partners.map((partner, index) => (
            <div key={index} className="flex flex-shrink-0 items-center justify-center">
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
