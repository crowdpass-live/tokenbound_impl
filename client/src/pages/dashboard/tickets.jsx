import React from 'react'
import Layout from '../../Components/dashboard/layout'
import ComingSoon from "../../Components/dashboard/coming-soon"

const Tickets = () => {
    const tickets = [
        {
            id: 1,
            eventName: "Coachella Music Festival",
            date: "April 14-16, 2023",
            imageUrl: "/assets/profile-picture.png",
        },
        {
            id: 2,
            eventName: "Crypto Expo 2023",
            date: "June 1-3, 2023",
            imageUrl: "/assets/profile-picture.png",
        },
    ]
    return (
        <Layout>
            {/* <section className="py-2 md:py-4">
                <div className="container px-4 md:px-6">
                    <div className="mb-8 md:mb-12">
                        <h1 className='text-3xl text-deep-blue font-semibold'>
                            My Tickets
                        </h1>
                    </div>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mb-5">
                        {
                            tickets.map(({ id, eventName, date, imageUrl }) => {
                                return (
                                    <TicketCard id={id} eventName={eventName} date={date} image={imageUrl} />
                                )
                            })
                        }
                    </div>
                </div>
            </section> */}
            <ComingSoon />

        </Layout>
    )
}

export default Tickets