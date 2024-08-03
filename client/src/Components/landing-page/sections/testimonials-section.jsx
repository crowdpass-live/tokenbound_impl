import React from 'react'
import { Button } from '../../shared/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import TestimonialCard from '../testimonial-card'

const TestimonialsSection = () => {
    const testimonials = [
        {
            person: "/assets/testimonial-person-one.png",
            name: "Adekunle Stephen",
            review: "CrowdPass has revolutionized the way I manage events. The platform's seamless ticketing and analytics features have saved me time and increased attendance.",
            role: "Event Organizer"
        },
        {
            person: "/assets/testimonial-person-two.png",
            name: "Adeola Kenedy",
            review: "I've attended several events managed by CrowdPass, and I'm always impressed by the smooth check-in process and engaging experience. It's a game-changer for event attendees!",
            role: "Event Attendee"
        },
    ]

    const cards = testimonials.map(({ person, name, review, role }, index) => {
        return (
            <TestimonialCard person={person} name={name} review={review} role={role} key={index} />
        )
    })

    return (
        <div className='flex gap-6 justify-center items-center pt-24 bg-base-white '>
            <div className='max-w-[1280px] flex gap-6'>
                <div className='flex flex-col gap-6 '>
                    <h2 className='text-4xl text-deep-blue'>Join Us</h2>
                    <p className='text-[#777D7F] pt-3'>Discover why event organizers and attendees alike are raving about CrowdPass. Read their reviews and see how our platform has transformed their event management experience with seamless, secure, and innovative solutions.</p>
                    <div className='flex items-center gap-4'>
                        <div className='flex gap-4'>
                            <Button size="icon">
                                <ChevronLeft size={32} className="text-deep-blue font-bold bg-primary" />
                            </Button>
                            <Button size="icon">
                                <ChevronRight size={32} className=" text-deep-blue bg-primary" />
                            </Button>
                        </div>
                    </div>
                </div>
                <div className='flex gap-3'>
                    {cards}
                </div>
            </div>

        </div>)
}

export default TestimonialsSection