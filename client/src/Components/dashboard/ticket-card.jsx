import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from "../shared/button"

const TicketCard = ({ id, eventName, date, image }) => {
    return (
        <div key={id} className="relative overflow-hidden rounded-lg bg-white shadow-2xl">
            <Link to={`/events/${id}`} className="absolute inset-0 z-10" prefetch={false}>
                <span className="sr-only">View ticket details</span>
            </Link>
            <img
                src={image}
                alt={eventName}
                width={400}
                height={300}
                className="h-60 w-full object-cover"
            />
            <div className="p-4">
                <h3 className="text-lg font-semibold text-deep-blue">{eventName}</h3>
                <p className="text-sm text-muted-foreground text-deep-blue">{date}</p>
                <Link to={`/events/${id}`} className="absolute inset-0 z-10" prefetch={false}>
                <Button  className="m-2 bg-deep-blue text-primary hover:text-deep-blue">
                    View Details
                </Button>
                </Link>
            </div>
        </div>
    )
}

export default TicketCard