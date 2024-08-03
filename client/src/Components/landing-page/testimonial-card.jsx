import React from 'react'
import { Card } from '../shared/card'


const TestimonialCard = ({ person, name, review, role }) => {
    return (
        <Card className="w-[400px] flex flex-col justify-center items-center border-white bg-white px-4 pb-4 rounded-2xl mb-16 shadow-lg">
            <img src={person} width={110} height={110} className='-mt-14 rounded-full' />
            <h3 className='text-deep-blue font-semibold mt-2'>{name}</h3>
            <p className='text-[#777D7F] pt-3 text-center'>{review}</p>
            <h3 className='text-deep-blue font-light mt-2'>{role}</h3>
        </Card>
    )
}

export default TestimonialCard