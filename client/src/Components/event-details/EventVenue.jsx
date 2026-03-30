import { MapPin, ArrowRight } from 'lucide-react'
import PropTypes from 'prop-types'

const EventVenue = ({ location, address, city }) => {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address + ', ' + city)}`
  
  return (
    <div className="space-y-6">
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
        {/* Map Placeholder */}
        <div className="h-48 bg-gradient-to-br from-accent-orange/20 to-dark-bg flex items-center justify-center">
          <MapPin className="w-16 h-16 text-accent-orange/50" />
        </div>
        
        {/* Venue Info */}
        <div className="p-6">
          <h3 className="text-xl font-bold text-white mb-2">{location}</h3>
          <p className="text-gray-400 mb-4">{address}, {city}</p>
          <a 
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-accent-orange hover:text-accent-orange/80 transition-colors"
          >
            <span>Get Directions</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  )
}

EventVenue.propTypes = {
  location: PropTypes.string.isRequired,
  address: PropTypes.string.isRequired,
  city: PropTypes.string.isRequired
}

export default EventVenue
