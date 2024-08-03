import React from 'react'
import { Card } from '../shared/card'


const FeaturesCard = ({ icon, title, description }) => {
    return (
        <Card className="w-[400px] flex flex-col justify-center items-center border-white bg-white px-4 pb-4 rounded-2xl mb-16">
            <div className='bg-deep-blue p-6 -mt-14 rounded-full'>
                <img src={icon} width={64} height={64} />
            </div>
            <h3 className='text-deep-blue font-semibold mt-2'>{title}</h3>
            <p className='text-[#777D7F] pt-3'>{description}</p>
        </Card>
    )
}

export default FeaturesCard