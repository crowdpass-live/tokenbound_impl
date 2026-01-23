import PropTypes from 'prop-types'
import { cn } from '../../lib/utils'
import { MapPin, ExternalLink, Navigation } from 'lucide-react'
import { Button } from '../shared/button'

const VenueCard = ({ 
  name, 
  address, 
  city, 
  mapUrl, 
  mapImageUrl,
  additionalInfo,
  className 
}) => {
  const fullAddress = `${address}${city ? `, ${city}` : ''}`
  const googleMapsUrl = mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`
  
  return (
    <div className={cn(
      "overflow-hidden bg-white dark:bg-zinc-800 rounded-2xl shadow-lg border border-gray-100 dark:border-zinc-700",
      className
    )}>
      {/* Map Preview */}
      <div className="relative h-48 bg-gray-200 dark:bg-zinc-700">
        {mapImageUrl ? (
          <img 
            src={mapImageUrl} 
            alt={`Map of ${name}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-deep-blue/5 to-primary/10">
            <MapPin className="w-16 h-16 text-deep-blue/30 dark:text-primary/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-xl font-bold text-white">{name}</h3>
        </div>
      </div>
      
      {/* Venue Info */}
      <div className="p-6">
        <div className="flex items-start gap-3 mb-4">
          <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-deep-blue dark:text-white font-medium">{address}</p>
            {city && <p className="text-gray-500 dark:text-gray-400 text-sm">{city}</p>}
          </div>
        </div>
        
        {additionalInfo && (
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{additionalInfo}</p>
        )}
        
        <div className="flex gap-3">
          <a 
            href={googleMapsUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-1"
          >
            <Button className="w-full bg-deep-blue text-white hover:bg-deep-blue/90 flex items-center justify-center gap-2">
              <Navigation className="w-4 h-4" />
              Get Directions
            </Button>
          </a>
          <a 
            href={googleMapsUrl} 
            target="_blank" 
            rel="noopener noreferrer"
          >
            <Button variant="outline" className="border-deep-blue text-deep-blue hover:bg-deep-blue/5">
              <ExternalLink className="w-4 h-4" />
            </Button>
          </a>
        </div>
      </div>
    </div>
  )
}

VenueCard.propTypes = {
  name: PropTypes.string.isRequired,
  address: PropTypes.string.isRequired,
  city: PropTypes.string,
  mapUrl: PropTypes.string,
  mapImageUrl: PropTypes.string,
  additionalInfo: PropTypes.string,
  className: PropTypes.string
}

export default VenueCard
