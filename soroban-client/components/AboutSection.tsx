import Image from 'next/image';

export default function AboutSection() {
    return (
        <section className="w-full py-24 bg-[#18181B] flex items-center justify-center">

            {/* Container for Image Grid and Card */}
            <div className="relative w-full max-w-[1300px] h-[800px] mx-6">

                {/* Image Grid Subset - Rounded Container */}
                {/* Using standard grid order: TL=Team, TR=Speaker, BL=Concert, BR=Dinner */}
                <div className="absolute inset-0 w-full h-full rounded-[3rem] overflow-hidden grid grid-cols-2 grid-rows-2">
                    <div className="relative w-full h-full">
                        <Image src="/about-team.png" alt="Team" fill className="object-cover" />
                    </div>
                    <div className="relative w-full h-full">
                        <Image src="/about-speaker.png" alt="Speaker" fill className="object-cover" />
                    </div>
                    <div className="relative w-full h-full">
                        <Image src="/about-concert.png" alt="Concert" fill className="object-cover" />
                    </div>
                    <div className="relative w-full h-full">
                        <Image src="/about-dinner.png" alt="Dinner" fill className="object-cover" />
                    </div>
                </div>

                {/* Overlay Card - Centered - "Bigger" Prominence */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[600px] bg-[#525252] rounded-[2rem] p-10 md:p-14 shadow-2xl z-10 flex flex-col justify-center">
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-8 text-left">
                        About Us
                    </h2>

                    <div className="space-y-6 text-gray-100 text-[15px] md:text-base leading-relaxed mb-10 text-left">
                        <p>
                            Welcome to CrowdPass, your premier event ticketing and management solution. Our platform is designed to help event organizers create, manage, and promote their events with ease.
                        </p>
                        <p>
                            At CrowdPass, we believe that events have the power to bring people together and create lasting memories. That’s why we’re dedicated to providing a seamless and secure ticketing experience for attendees, while also offering a range of tools and resources to help event organizers succeed.
                        </p>
                        <p>
                            CrowdPass helps you transform your event into an unforgettable experience. With seamless attendee management, secure ticketing, and enhanced engagement tools.
                        </p>
                    </div>

                    <button className="w-full bg-[#FF5722] hover:bg-[#F4511E] text-white text-lg font-bold py-4 rounded-xl shadow-lg transition transform hover:-translate-y-1">
                        Explore
                    </button>
                </div>

            </div>

        </section>
    );
}
