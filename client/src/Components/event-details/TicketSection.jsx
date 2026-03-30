import { Heart, Share2 } from 'lucide-react'
import { Button } from '../shared/button'
import TicketCard from './TicketCard'
import PropTypes from 'prop-types'

const TicketProgress = ({ ticketsSold, totalTickets }) => {
  const percentage = (ticketsSold / totalTickets) * 100
  const remaining = totalTickets - ticketsSold

  return (
    <div className="mt-6 pt-6 border-t border-white/10">
      <div className="flex justify-between text-sm mb-2">
        <span className="text-gray-400">Tickets Sold</span>
        <span className="text-white font-medium">{ticketsSold} / {totalTickets}</span>
      </div>
      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-accent-orange to-accent-orange/70 rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-2">
        {remaining} tickets remaining
      </p>
    </div>
  )
}

TicketProgress.propTypes = {
  ticketsSold: PropTypes.number.isRequired,
  totalTickets: PropTypes.number.isRequired
}

const TicketSection = ({ 
  ticketTypes, 
  ticketsSold, 
  totalTickets, 
  isLiked, 
  onLikeToggle, 
  onShare 
}) => {
  return (
    <div className="lg:col-span-1">
      <div className="sticky top-24 space-y-6">
        {/* Ticket Selection Card */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Select Tickets</h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={onLikeToggle}
                className={`p-2 rounded-full transition-colors ${
                  isLiked ? 'bg-red-500/20 text-red-500' : 'bg-white/10 text-gray-400 hover:text-white'
                }`}
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
              </button>
              <button 
                onClick={onShare}
                className="p-2 rounded-full bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Ticket Types */}
          <div className="space-y-4">
            {ticketTypes.map((ticket, index) => (
              <TicketCard key={index} ticket={ticket} />
            ))}
          </div>

          {/* Tickets Progress */}
          <TicketProgress ticketsSold={ticketsSold} totalTickets={totalTickets} />
        </div>

        {/* CTA Button */}
        <Button className="w-full bg-accent-orange hover:bg-accent-orange/90 text-white font-bold py-4 text-lg rounded-xl">
          Get Tickets Now
        </Button>
        
        <p className="text-center text-sm text-gray-500">
          Secure checkout powered by Stellar
        </p>
      </div>
    </div>
  )
}

TicketSection.propTypes = {
  ticketTypes: PropTypes.array.isRequired,
  ticketsSold: PropTypes.number.isRequired,
  totalTickets: PropTypes.number.isRequired,
  isLiked: PropTypes.bool.isRequired,
  onLikeToggle: PropTypes.func.isRequired,
  onShare: PropTypes.func.isRequired
}

export default TicketSection
