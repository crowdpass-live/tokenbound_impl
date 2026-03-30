import PropTypes from 'prop-types'
import { Card, CardFooter } from "../shared/card"
import { Button } from "../shared/button"
import { Badge } from "../shared/badge"
import { Link } from 'react-router-dom'
import { Calendar, Clock, MapPin } from 'lucide-react'

const ExploreEventCard = ({ event }) => {
  const { id, title, date, time, location, category, price, image, description } = event

  return (
    <Card className="w-full bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <div className="relative">
        <img
          src={image}
          alt={title}
          className="w-full h-48 object-cover"
        />
        <Badge
          className="absolute top-3 left-3 bg-deep-blue text-primary px-3 py-1"
        >
          {category}
        </Badge>
        {price === 0 && (
          <Badge
            className="absolute top-3 right-3 bg-active-green text-white px-3 py-1"
          >
            Free
          </Badge>
        )}
      </div>

      <div className="p-4 space-y-3">
        <h3 className="text-lg font-semibold text-deep-blue line-clamp-2 min-h-[3.5rem]">
          {title}
        </h3>

        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" aria-hidden="true" />
            <span>{date}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" aria-hidden="true" />
            <span>{time}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" aria-hidden="true" />
            <span className="truncate">{location}</span>
          </div>
        </div>

        <p className="text-sm text-gray-500 line-clamp-2 min-h-[2.5rem]">
          {description}
        </p>

        <CardFooter className="p-0 pt-3 flex items-center justify-between border-t border-gray-100">
          <div className="text-deep-blue font-bold">
            {price === 0 ? (
              <span className="text-active-green">Free</span>
            ) : (
              <span>${price}</span>
            )}
          </div>
          <div className="flex gap-2">
            <Link to={`/events/${id}`}>
              <Button
                variant="outline"
                size="sm"
                className="text-deep-blue border-deep-blue hover:bg-deep-blue hover:text-white"
                aria-label={`View details for ${title}`}
              >
                Details
              </Button>
            </Link>
            <Button
              size="sm"
              className="bg-deep-blue text-primary hover:bg-primary hover:text-deep-blue"
              aria-label={`Buy tickets for ${title}`}
            >
              Buy Ticket
            </Button>
          </div>
        </CardFooter>
      </div>
    </Card>
  )
}

ExploreEventCard.propTypes = {
  event: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    date: PropTypes.string.isRequired,
    time: PropTypes.string.isRequired,
    location: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
    price: PropTypes.number.isRequired,
    image: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
  }).isRequired,
}

export default ExploreEventCard
