import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../shared/accordion'
import React from 'react'

const FaqAccordion = () => {

    const FaqAccordionData = [
        {
            title: "What is CrowdPass?",
            description: "CrowdPass is a decentralized event ticketing and management platform that allows event organizers to create, manage, and promote their events with ease."
        }, {
            title: "How do I create an event on CrowdPass?",
            description: "To create an event on CrowdPass, simply sign up for an account, click on 'Create Event', and fill out the event details. Our platform will guide you through the process."
        }, {
            title: "What is POAP, and how does it work?",
            description: "POAP (Proof of Attendance Protocol) is a digital collectible that proves attendance at an event. CrowdPass integrates POAP to reward attendees and create a unique experience."
        }, {
            title: "Is my data secure on CrowdPass?",
            description: "Yes, CrowdPass prioritizes data security. We use robust security measures to protect your data and ensure a safe and secure experience."
        }, {
            title: "How do I contact CrowdPass support?",
            description: "You can contact CrowdPass support by clicking on the 'Support' button on our website or by sending an email to support@CrowdPass.com. We're here to help!"
        },
    ]
    return (
        <Accordion type="single" collapsible className="w-[500px] flex flex-col gap-6">
            {
                FaqAccordionData.map(({ title, description }, index) => {
                    return (
                        <AccordionItem className="rounded-md bg-white w-[500px] border-y-2 border-r-2" value={`item-${index +1 }`} key={index}>
                            <AccordionTrigger className=" px-6  border-base-white h-16">
                                    <p className='text-xl font-semibold text-deep-blue'>{title}</p>
                            </AccordionTrigger>
                            <AccordionContent className="text-base text-[#777D7F] px-6">
                                {description}
                            </AccordionContent>
                        </AccordionItem>
                    )
                })
            }
        </Accordion>
    )
}

export default FaqAccordion