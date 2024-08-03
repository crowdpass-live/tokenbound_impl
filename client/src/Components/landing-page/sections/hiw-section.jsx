import React from 'react'
import HiwAccordion from '../hiw-accordion'

const HiwSection = () => {
    
    return (
        <div className='bg-base-white flex flex-col justify-center items-center'>
            <div className='flex flex-col justify-center items-center max-w-[1280px]'>
                <h1 className='text-deep-blue text-6xl font-bold pt-16 pb-20'>How it works</h1>
                <div className='flex justify-center items-center gap-12'>
                    <img src="/assets/hiw-image-one.png" alt="image-1" />
                    <HiwAccordion />
                </div>
            </div>
        </div>
    )
}

export default HiwSection