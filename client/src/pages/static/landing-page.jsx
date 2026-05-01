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
import SEO from '../../Components/shared/seo'

const LandingPage = () => {
  return (
    <>
    <SEO 
      title="Home"
      description="CrowdPass is the leading event management platform for Web3. Create, manage, and promote your events seamlessly."
    />
    <div className='overflow-x-hidden'>
        <HeroSection />
        <UpdateSection />
        <AboutSection />
        <FeaturesSection />
        <HiwSection />
        <FaqSection />
        <UpcomingSection />
        <TestimonialsSection />
        <img src='/assets/various-events.jpg' className='w-full bg-cover' alt="Various community events collage" />
        <Footer />
    </div>
    </>
  )
}

export default LandingPage