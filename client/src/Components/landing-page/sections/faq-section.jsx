import React from 'react'
import PartnersCard from '../partners-card'
import FaqAccordion from '../faq-accordion'

const FaqSection = () => {
    return (
        <div className='bg-white flex flex-col justify-center items-center py-6 my-10'>
            <div className='flex justify-center items-center max-w-[1280px] gap-8'>        
                <PartnersCard />
                <div className='flex flex-col gap-4'>
                    <h2 className='text-4xl text-deep-blue'>Frequently Asked Questions</h2>
                    <FaqAccordion />
                </div>
            </div>
        </div>
    )
}

export default FaqSection