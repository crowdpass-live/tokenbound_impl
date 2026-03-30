import { Check } from 'lucide-react'
import PropTypes from 'prop-types'

const EventAbout = ({ description, highlights, organizer }) => {
  return (
    <div className="space-y-6">
      {/* Description */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-white mb-4">About This Event</h2>
        <p className="text-gray-300 leading-relaxed whitespace-pre-line">
          {description}
        </p>
      </div>
      
      {/* Highlights */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">What You&apos;ll Get</h3>
        <ul className="space-y-3">
          {highlights.map((highlight, index) => (
            <li key={index} className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-orange/20 flex items-center justify-center mt-0.5">
                <Check className="w-4 h-4 text-accent-orange" />
              </div>
              <span className="text-gray-300">{highlight}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Organizer */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">Organized By</h3>
        <div className="flex items-center gap-4">
          <img 
            src={organizer.image} 
            alt={organizer.name}
            className="w-16 h-16 rounded-full object-cover border-2 border-accent-orange/30"
          />
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-lg font-semibold text-white">{organizer.name}</h4>
              {organizer.verified && (
                <span className="px-2 py-0.5 bg-light-green/20 text-light-green text-xs font-medium rounded-full">
                  Verified
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm">Event Organizer</p>
          </div>
        </div>
      </div>
    </div>
  )
}

EventAbout.propTypes = {
  description: PropTypes.string.isRequired,
  highlights: PropTypes.arrayOf(PropTypes.string).isRequired,
  organizer: PropTypes.shape({
    name: PropTypes.string.isRequired,
    image: PropTypes.string.isRequired,
    verified: PropTypes.bool
  }).isRequired
}

export default EventAbout
