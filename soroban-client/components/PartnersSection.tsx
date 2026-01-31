"use client";
import React from 'react';
import Image from 'next/image';

export default function PartnersSection() {
    const partners = [
        { name: 'Argent', type: 'argent', logo: '/argent.svg' },
        { name: 'Starknet Foundation', type: 'foundation', logo: '/starknet.svg' },
        { name: 'Starknet', type: 'starknet', logo: '/starknet.svg' },
        // Duplicate for infinite scroll effect
        { name: 'Argent', type: 'argent', logo: '/argent.svg' },
        { name: 'Starknet Foundation', type: 'foundation', logo: '/starknet.svg' },
        { name: 'Starknet', type: 'starknet', logo: '/starknet.svg' },
        // Duplicate again
        { name: 'Argent', type: 'argent', logo: '/argent.svg' },
        { name: 'Starknet Foundation', type: 'foundation', logo: '/starknet.svg' },
        { name: 'Starknet', type: 'starknet', logo: '/starknet.svg' },
        // Duplicate again
        { name: 'Argent', type: 'argent', logo: '/argent.svg' },
        { name: 'Starknet Foundation', type: 'foundation', logo: '/starknet.svg' },
        { name: 'Starknet', type: 'starknet', logo: '/starknet.svg' },
    ];

    return (
        <section className="bg-[#18181B] pb-24 border-t border-gray-800">
            <div className="pt-16 pb-12 text-center">
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
                    Our Partners
                </h2>
            </div>

            {/* Marquee Container */}
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
                            {partner.type === 'argent' && (
                                <div className="flex items-center gap-2">
                                    {/* Argent Logo is typically orange logo + text. I'll use the SVG I downloaded */}
                                    <Image src="/argent.svg" alt="Argent" width={160} height={50} className="h-10 w-auto" />
                                </div>
                            )}

                            {partner.type === 'foundation' && (
                                <div className="bg-white rounded-lg px-4 py-2 flex items-center gap-2 shadow-lg">
                                    <div className="bg-[#0c0c4f] rounded-full p-1 w-8 h-8 flex items-center justify-center">
                                        <Image src="/starknet.svg" alt="Starknet" width={24} height={24} className="h-4 w-4" />
                                    </div>
                                    <span className="text-[#0c0c4f] font-bold text-lg">STARKNET</span>
                                    <span className="text-[#0c0c4f] text-xs self-end mb-1 ml-0.5 opacity-80">FOUNDATION</span>
                                </div>
                            )}

                            {partner.type === 'starknet' && (
                                <div className="flex items-center gap-2">
                                    <Image src="/starknet.svg" alt="Starknet" width={50} height={50} className="h-12 w-12" />
                                </div>
                            )}
                        </div>
                    ))}
                    {/* Duplicated set for seamless loop done in map above, 
              but typically better to map twice or triple depending on screen width. 
              Let's just replicate the items in the data array enough times. 
           */}
                </div>
            </div>
        </section>
    );
}
