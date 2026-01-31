import React from 'react';
import Image from 'next/image';

export default function HowItWorksSection() {
    const steps = [
        {
            id: 1,
            title: "Browse Events.",
            description: "Explore a wide range of events on the platform, filter by category, location, or date, and select the event that interests you.",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S12 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S12 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
            ),
            active: true
        },
        {
            id: 2,
            title: "Connect Your Wallet.",
            description: "Securely connect your digital wallet to purchase tickets and manage your event identity.",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
                </svg>
            ),
            active: false
        },
        {
            id: 3,
            title: "Purchase Your Ticket.",
            description: "Buy tickets instantly using cryptocurrency or credit card. Your ticket is stored as an NFT for easy access.",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v4.072c.421.069.827.231 1.206.468l.33.206c.491.31.959.722 1.353 1.189.605.717 1.053 1.637 1.168 2.682.022.196.023.393 0 .589-.133 2.193-2.65 3.32-4.057 2.258V18c0 .621.504 1.125 1.125 1.125h15.75c.621 0 1.125-.504 1.125-1.125V9.232c-1.408 1.062-3.924-.065-4.057-2.258a3.3 3.3 0 01.001-.589c.115-1.045.563-1.965 1.168-2.682.394-.467.863-.879 1.353-1.189l.33-.206c.38-.237.785-.399 1.206-.468V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                </svg>
            ),
            active: false
        },
        {
            id: 4,
            title: "Attend the Event.",
            description: "Simply show your QR code at the entrance. Enjoy the event and connect with other attendees!",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
            ),
            active: false
        }
    ];

    return (
        <section className="bg-[#18181B] py-24 overflow-hidden">
            <div className="container mx-auto px-4">
                <h2 className="text-center text-4xl md:text-5xl font-bold text-white mb-20">
                    How it Works
                </h2>

                <div className="flex flex-col lg:flex-row items-center justify-center gap-16 lg:gap-24 relative">

                    {/* Left Column: Image with Rings */}
                    <div className="relative w-[300px] h-[300px] md:w-[400px] md:h-[400px] flex-shrink-0">
                        {/* Dashed Ring - Rotating or Static */}
                        <div className="absolute -inset-8 md:-inset-12 border-[2px] border-dashed border-[#FF5722] rounded-full opacity-70 animate-spin-slow"></div>

                        {/* Solid Ring & Image */}
                        <div className="relative w-full h-full rounded-full border-[8px] border-[#FF5722] overflow-hidden shadow-2xl">
                            <Image
                                src="/how_it_works_hero.png"
                                alt="How it works"
                                fill
                                className="object-cover"
                            />
                        </div>
                    </div>

                    {/* Right Column: Steps List */}
                    <div className="w-full max-w-lg space-y-4">
                        {steps.map((step) => (
                            <div
                                key={step.id}
                                className={`flex items-start p-6 rounded-xl transition-all duration-300 ${step.active
                                        ? 'bg-[#525252] border-l-4 border-[#FF5722] shadow-lg'
                                        : 'bg-[#525252]/60 hover:bg-[#525252]'
                                    }`}
                            >
                                {/* Icon Circle */}
                                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center mr-5 ${step.active ? 'bg-[#FF5722] text-white' : 'bg-[#18181B] text-[#FF5722]'
                                    }`}>
                                    {step.icon}
                                </div>

                                {/* Content */}
                                <div className="flex-1">
                                    <h3 className={`text-lg font-bold mb-2 ${step.active ? 'text-white' : 'text-gray-200'}`}>
                                        {step.title}
                                    </h3>
                                    {step.active && (
                                        <p className="text-gray-300 text-sm leading-relaxed">
                                            {step.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                </div>
            </div>
        </section>
    );
}
