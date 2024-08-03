import React from 'react'
import HeroSection from '../../Components/landing-page/sections/hero-section'
import AboutSection from '../../Components/landing-page/sections/about-section'
import FeaturesSection from '../../Components/landing-page/sections/features-section'
import UpdateSection from '../../Components/landing-page/sections/update-section'
import HiwSection from '../../Components/landing-page/sections/hiw-section'
import FaqSection from '../../Components/landing-page/sections/faq-section'
import UpcomingSection from '../../Components/landing-page/sections/upcoming-section'
import TestimonialsSection from '../../Components/landing-page/sections/testimonials-section'
import Footer from "../../Components/landing-page/footer"

const LandingPage = () => {
  return (
    <div className='overflow-x-hidden'>
        <HeroSection />
        <UpdateSection />
        <AboutSection />
        <FeaturesSection />
        <HiwSection />
        <FaqSection />
        <UpcomingSection />
        <TestimonialsSection />
        <img src='/assets/various-events.jpg' className='w-full bg-cover'/>
        <Footer />
    </div>
  )
}

export default LandingPage