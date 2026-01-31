import Image from 'next/image';

export default function Hero() {
    return (
        <section className="relative min-h-screen flex items-center pt-32 pb-20 px-4 overflow-hidden bg-[#18181B]">
            <div className="max-w-[1400px] mx-auto w-full grid lg:grid-cols-2 gap-8 items-center">

                {/* Text Content */}
                <div className="relative z-50 pl-4 lg:pl-12">
                    <p className="text-[#FF5722] font-semibold tracking-wider mb-4 uppercase text-sm">
                        Reinvent your events
                    </p>
                    <h1 className="text-5xl lg:text-[4.5rem] font-bold text-white leading-[1.1] mb-8 tracking-tight">
                        Secure Tickets,<br />
                        Seamless Access —<br />
                        Anytime, Anywhere<br />
                        with <span className="text-[#FF5722]">CrowdPass</span>
                    </h1>

                    <button className="bg-[#FF5722] hover:bg-[#F4511E] text-white text-lg px-10 py-4 rounded-xl font-bold shadow-lg transition transform hover:-translate-y-1">
                        Get Started
                    </button>
                </div>

                {/* Image Collage Area */}
                <div className="relative h-[600px] w-full flex items-center justify-center scale-75 md:scale-90 lg:scale-100 origin-center lg:origin-right">
                    <div className="relative w-[900px] h-[600px]">

                        {/* 1. Balloons (Far Left) */}
                        <div className="absolute left-0 top-[100px] w-[180px] h-[280px] rounded-[1.5rem] overflow-hidden border-[3px] border-white/10 shadow-2xl z-20 hover:scale-105 transition duration-500">
                            <Image src="/hero-balloons.png" alt="Balloons" fill className="object-cover" />
                        </div>

                        {/* Arrow Decoration (Bottom Left) */}
                        <div className="absolute left-[40px] bottom-[60px] z-10">
                            <svg width="80" height="80" viewBox="0 0 100 100" fill="none">
                                <path d="M10 90 L80 20 M80 20 L50 20 M80 20 L80 50" stroke="#FF5722" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>

                        {/* 2. Concert (Top Center) */}
                        <div className="absolute left-[220px] top-[0px] w-[500px] h-[350px] rounded-[2rem] overflow-hidden border-[3px] border-white/10 shadow-2xl z-10">
                            <Image src="/hero-concert.png" alt="Concert" fill className="object-cover" />
                        </div>

                        {/* 3. Meeting (Bottom Right of Center Column) */}
                        <div className="absolute left-[380px] top-[280px] w-[340px] h-[220px] rounded-[1.5rem] overflow-hidden border-[3px] border-white/10 shadow-2xl z-30 hover:scale-105 transition duration-500">
                            <Image src="/hero-meeting.png" alt="Meeting" fill className="object-cover" />
                        </div>

                        {/* 4. Toast (Far Right) */}
                        <div className="absolute right-[20px] top-[120px] w-[180px] h-[360px] rounded-[1.5rem] overflow-hidden border-[3px] border-white/10 shadow-2xl z-20 hover:scale-105 transition duration-500">
                            <Image src="/hero-toast.png" alt="Toast" fill className="object-cover" />
                        </div>

                        {/* Lines Decoration (Top Right) */}
                        <div className="absolute right-[60px] top-[20px] z-10">
                            <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
                                <line x1="20" y1="80" x2="20" y2="40" stroke="white" strokeWidth="3" strokeLinecap="round" />
                                <line x1="90" y1="10" x2="40" y2="60" stroke="#FF5722" strokeWidth="4" strokeLinecap="round" />
                                <line x1="50" y1="90" x2="90" y2="88" stroke="white" strokeWidth="3" strokeLinecap="round" />
                            </svg>
                        </div>

                    </div>
                </div>

            </div>
        </section>
    );
}
