import { MapPin } from 'lucide-react'
import PropTypes from 'prop-types'

const LocationCard = ({ venue, address, mapImageUrl }) => {
  const defaultMapImage = "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=600&q=80"
  
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white">Location</h2>
      
      {/* Map Image */}
      <div className="rounded-xl overflow-hidden">
        <img 
          src={mapImageUrl || defaultMapImage} 
          alt="Event location map"
          className="w-full h-48 object-cover"
        />
      </div>
      
      {/* Location Info Card */}
      <div className="bg-[#2a2a2a] rounded-xl p-4 flex items-start gap-3">
        <div className="w-10 h-10 bg-accent-orange rounded-full flex items-center justify-center flex-shrink-0">
          <MapPin className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-white font-semibold">{venue}</p>
          <p className="text-gray-400 text-sm">{address}</p>
        </div>
      </div>
    </div>
  )
}

LocationCard.propTypes = {
  venue: PropTypes.string.isRequired,
  address: PropTypes.string.isRequired,
  mapImageUrl: PropTypes.string
}

export default LocationCard
