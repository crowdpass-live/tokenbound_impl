"use client";
import React from 'react';
import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="bg-[#52525b] text-white py-16">
            <div className="container mx-auto px-4 md:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
                    {/* Column 1: Brand & Newsletter */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2">
                            {/* Placeholder for Logo - Using text/icon to match 'CrowdPass' style */}
                            <div className="flex items-center gap-2">
                                <div className="grid grid-cols-2 gap-0.5">
                                    <div className="w-3 h-3 bg-white"></div>
                                    <div className="w-3 h-3 bg-white"></div>
                                    <div className="w-3 h-3 bg-white"></div>
                                    <div className="w-3 h-3 bg-white/50"></div>
                                </div>
                                <span className="text-2xl font-semibold tracking-tight">CrowdPass</span>
                            </div>
                        </div>
                        <p className="text-gray-200 text-sm leading-relaxed max-w-xs">
                            Step into the future with CrowdPass — where every ticket unlocks more than just entry, it tells a story of secure, seamless experiences. From exclusive events to unforgettable moments, your next adventure starts here.
                        </p>
                        <div className="relative max-w-xs">
                            <input
                                type="email"
                                placeholder="Enter email to subscribe to our newsletter"
                                className="w-full bg-[#65656e] text-white placeholder-gray-300 px-4 py-3 rounded border border-gray-500 focus:outline-none focus:border-white text-sm pr-12"
                            />
                            <button className="absolute right-1 top-1 bottom-1 bg-[#F97316] hover:bg-[#ea580c] text-white rounded px-3 flex items-center justify-center transition-colors">
                                {/* Paper Plane Icon */}
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="22" y1="2" x2="11" y2="13"></line>
                                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Column 2: Quick Links 1 */}
                    <div className="md:ml-auto">
                        <h3 className="font-semibold text-lg mb-6">Quick Links</h3>
                        <ul className="space-y-4 text-gray-200 text-sm">
                            <li><Link href="/" className="hover:text-white transition-colors">Home</Link></li>
                            <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
                            <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                        </ul>
                    </div>

                    {/* Column 3: Quick Links 2 */}
                    <div className="md:ml-auto">
                        <h3 className="font-semibold text-lg mb-6">Quick Links</h3>
                        <ul className="space-y-4 text-gray-200 text-sm">
                            <li><Link href="/signup" className="hover:text-white transition-colors">Sign Up</Link></li>
                            <li><Link href="/login" className="hover:text-white transition-colors">Log In</Link></li>
                            <li><Link href="/terms" className="hover:text-white transition-colors">Terms & Condition</Link></li>
                            <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                        </ul>
                    </div>

                    {/* Column 4: Quick Links 3 */}
                    <div className="md:ml-auto">
                        <h3 className="font-semibold text-lg mb-6">Quick Links</h3>
                        <ul className="space-y-4 text-gray-200 text-sm">
                            <li><Link href="/create-event" className="hover:text-white transition-colors">Create Event</Link></li>
                            <li><Link href="/get-spok" className="hover:text-white transition-colors">Get SPOK</Link></li>
                            <li><Link href="/attend" className="hover:text-white transition-colors">Attend Event</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-gray-600/50 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                        <span>©</span>
                        <span>All Rights Reserved, HostIT 2024.</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <a href="#" className="bg-[#F97316] p-1.5 rounded text-white hover:bg-[#ea580c] transition-colors">
                            {/* Facebook */}
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                        </a>
                        <a href="#" className="bg-[#F97316] p-1.5 rounded text-white hover:bg-[#ea580c] transition-colors">
                            {/* Instagram */}
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                        </a>
                        <a href="#" className="bg-[#F97316] p-1.5 rounded text-white hover:bg-[#ea580c] transition-colors">
                            {/* Youtube */}
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
                        </a>
                        <a href="#" className="bg-[#F97316] p-1.5 rounded text-white hover:bg-[#ea580c] transition-colors">
                            {/* X / Twitter */}
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l11.733 16h8.895L15 8 4 4z"></path><path d="M4 20l6.768-6.768m2.46-2.46L20 4"></path></svg>
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
