import React from 'react'
import FeaturesCard from '../features-card'

const FeaturesSection = () => {
    const featuresData = [
        {
            icon: "/assets/event-management.png",
            title: "Event Management",
            description: "Streamline your event planning process with our intuitive event management tools. Create, manage, and promote your events with ease."
        }, {
            icon: "/assets/real-time-analytics.png",
            title: "Real Time Analytics",
            description: "Get real-time insights into your event's performance with our analytics dashboard. Track attendance, engagement, and revenue in real-time."
        }, {
            icon: "/assets/poap-integration.png",
            title: "POAP Integration",
            description: "Enhance your event experience with our POAP (Proof of Attendance Protocol) integration. Reward attendees for their participation and create a unique experience."
        }, {
            icon: "/assets/security.png",
            title: "Security",
            description: "Ensure the security and integrity of your event data with our robust security measures. Protect your attendees' information and prevent unauthorized access."
        }, {
            icon: "/assets/decentralized-identity.png",
            title: "Decentralized Identity",
            description: "Empower your attendees with decentralized identity management. Allow them to control their own data and identity, while ensuring a seamless event experience."
        },
    ]

    const cards = featuresData.map(({ icon, title, description }, index) => {
        return (
            <FeaturesCard icon={icon} title={title} description={description} key={index} />
        )
    })
    return (
        <div className='bg-base-white flex flex-col justify-center items-center'>
            <div className='flex flex-col justify-center items-center max-w-[1280px]'>
            <h1 className='text-deep-blue text-6xl font-bold pt-16 pb-20'>Features</h1>
            <div className='flex justify-center items-center flex-wrap gap-6'>
                {cards}
            </div>
            </div>
        </div>
    )
}

export default FeaturesSection