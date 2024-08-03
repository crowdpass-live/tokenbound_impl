import React from 'react'
import Header from '../header'
import { Button } from '../../shared/button'

const HeroSection = () => {
    return (
        <div className='bg-hero-image w-screen h-[calc(100vh-80px)] bg-cover'>
            <div className='bg-gray-950/90 z-10 w-full h-full '>
                <div className='z-20 px-[2.5%] flex flex-col items-center py-10 lg:px-[5%] gap-10 w-full h-full '>
                    <Header />
                    <div className='flex flex-col gap-2 w-full h-full justify-center items-center mb-36 pt-10'>
                        <p className='text-2xl text-primary font-medium 2xl:text-4xl'>Have an Event?</p>
                        <p className='text-6xl text-white font-medium 2xl:text-8xl'>Transform it with CrowdPass</p>
                        <Button className="bg-primary text-deep-blue text-lg px-10 py-2 font-semibold 2xl:text-2xl 2xl:py-6 2xl:px-12">Get Started</Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default HeroSection