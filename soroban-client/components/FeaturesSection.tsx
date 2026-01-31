import React from 'react';

export default function FeaturesSection() {
    const features = [
        {
            title: "Event Management",
            description: "Streamline your event planning process with our intuitive event management tools. Create, manage, and promote your events with ease.",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                    <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-4.42 6.753 6.753 0 01-1.481.644c-1.121.366-2.291.545-3.345.545v-.01e-05a22.597 22.597 0 01-.157-1.74z" />
                </svg>
            )
        },
        {
            title: "Real Time Analytics",
            description: "Get real-time insights into your event's performance with our analytics dashboard. Track attendance, engagement, and revenue in real-time.",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                    <path fillRule="evenodd" d="M2.25 13.5a8.25 8.25 0 018.25-8.25.75.75 0 01.75.75v6.75H18a.75.75 0 01.75.75 8.25 8.25 0 01-16.5 0z" clipRule="evenodd" />
                    <path fillRule="evenodd" d="M12.75 3a.75.75 0 01.75-.75 8.25 8.25 0 018.25 8.25.75.75 0 01-.75.75h-7.5a.75.75 0 01-.75-.75V3z" clipRule="evenodd" />
                </svg>
            )
        },
        {
            title: "Ticket Marketplace",
            description: "Transform event ticketing with a decentralized marketplace, enabling secure buying, selling, and transferring of tickets with full transparency and trust.",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                </svg>
            )
        },
        {
            title: "Security",
            description: "Ensure the security and integrity of your event data with our robust security measures. Protect your attendees' information and prevent unauthorized access.",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                    <path fillRule="evenodd" d="M12.516 2.17a.75.75 0 00-1.032 0 11.209 11.209 0 01-7.877 3.08.75.75 0 00-.722.515A12.74 12.74 0 002.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 00.374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.352-.272-2.636-.759-3.801a.754.754 0 00-.781-.522 11.209 11.209 0 01-7.694-3.257zM10.5 9a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v3h3a.75.75 0 010 1.5h-3v3a.75.75 0 01-1.5 0v-3h-3a.75.75 0 010-1.5h3V9z" clipRule="evenodd" />
                </svg>
            )
        },
        {
            title: "Decentralized Identity",
            description: "Empower your attendees with decentralized identity management. Allow them to control their own data and identity, while ensuring a seamless event experience.",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                    <path fillRule="evenodd" d="M4.5 3.75a3 3 0 00-3 3v10.5a3 3 0 003 3h15a3 3 0 003-3V6.75a3 3 0 00-3-3h-15zm4.125 3a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5zm-3.873 8.703a4.126 4.126 0 017.746 0 .75.75 0 01-.75.75H5.502a.75.75 0 01-.75-.75zm11.248-3.703a.75.75 0 01.75-.75h3a.75.75 0 01.75.75v.75a.75.75 0 01-.75.75h-3a.75.75 0 01-.75-.75v-.75zm.75 4.5a.75.75 0 00-7.5 0v.75a.75.75 0 00.75.75h6a.75.75 0 00.75-.75v-.75z" clipRule="evenodd" />
                </svg>
            )
        }
    ];

    return (
        <section className="bg-[#18181B] py-24">
            <div className="container mx-auto px-4">
                <h2 className="text-center text-4xl md:text-5xl font-bold text-white mb-20">
                    Our Features
                </h2>

                <div className="flex flex-wrap justify-center gap-8 max-w-7xl mx-auto">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="relative bg-[#525252] w-full md:w-[350px] p-8 pt-16 rounded-2xl flex flex-col items-center mt-8 shadow-lg"
                        >
                            {/* Floating Icon Circle */}
                            <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 w-20 h-20 bg-[#18181B] rounded-full flex items-center justify-center border-[6px] border-[#18181B]">
                                <div className="text-[#FF5722]">
                                    {feature.icon}
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-white text-center mb-4 mt-2">
                                {feature.title}
                            </h3>

                            <p className="text-gray-300 text-center text-sm leading-relaxed">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
