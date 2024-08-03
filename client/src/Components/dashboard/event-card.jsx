import React from 'react'
import { Card, CardFooter } from "../shared/card"
import { Button } from "../shared/button"
import { Link } from 'react-router-dom'

const EventCard = ({id}) => {

  return (
    <Card className="w-full max-w-md p-4 border border-muted rounded-lg">
      <img src="/assets/about-image-podcast.jpg" alt="Event Image" className="rounded-t-lg object-cover w-full h-48" />
      <div className="mt-4 space-y-4">
        <h3 className="text-2xl font-semibold">First Event</h3>
        <div className="flex items-center space-x-2 text-muted-foreground">
          <CalendarIcon className="w-5 h-5" />
          <span>July 23, 2024</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Join us for a weekend of hiking, camping, and exploring the great outdoors.
        </p>
        <CardFooter className="bg-base-white p-4 flex items-center justify-between">
          <Link to={`/events/${id}`}>
            <Button variant="outline" size="sm" className="text-deep-blue border-deep-blue">
              View Details
            </Button>
          </Link>
          <Link>
            <Button variant="primary" className="bg-deep-blue text-primary hover:text-deep-blue hover:bg-primary" size="sm">
              Buy Tickets
            </Button>
          </Link>
        </CardFooter>
      </div>
    </Card>
  )
}

export default EventCard

function CalendarIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </svg>
  )
}