import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../shared/accordion'
import React from 'react'

const HiwAccordion = () => {
    const HiwAccordionData = [
        {
            icon: "/assets/decentralized-identity.png",
            title: "Create and verify your identity",
            description: "Create a secure and decentralized identity to access events and experiences. Verify your identity with our robust verification process."
        }, {
            icon: "/assets/decentralized-identity.png",
            title: "Set up your event profile",
            description: "Complete your event profile with essential information, such as name, location, and date. Showcase your event to potential attendees."
        }, {
            icon: "/assets/real-time-analytics.png",
            title: "Manage event tickets and sales",
            description: "Effortlessly manage event tickets, track sales, and monitor revenue in real-time. Get insights into your event's performance."
        }, {
            icon: "/assets/event-management.png",
            title: "Engage with attendees and build community",
            description: "Foster meaningful connections with attendees through our community-building tools. Encourage engagement and create a loyal following."
        },]

    return (
        <Accordion type="single" collapsible className="w-[500px] p-8 gap-6">
            {
                HiwAccordionData.map(({ icon, title, description }, index) => {
                    return (
                        <AccordionItem className="rounded-md bg-white mb-6 w-[500px]" value={`item-${index + 1}`} key={index}>
                            <AccordionTrigger icon={false}>
                                <div className='p-4 rounded-full flex gap-4 justify-center items-center'>
                                    <div className='bg-deep-blue p-4 rounded-full'>
                                        <img src={icon} className='w-8 h-8' />
                                    </div>
                                    <p className='text-xl font-semibold text-deep-blue'>{title}</p>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="text-base text-[#777D7F] px-6">
                                {description}
                            </AccordionContent>
                        </AccordionItem>)
                })}
        </Accordion>
    )
}

export default HiwAccordion