import { Button } from '../shared/button'
import PropTypes from 'prop-types'

const TicketCard = ({ ticket }) => {
  const { name, price, currency, description, available, popular } = ticket
  const isSoldOut = available === 0

  return (
    <div 
      className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer ${
        popular 
          ? 'border-accent-orange bg-accent-orange/5' 
          : 'border-white/10 hover:border-white/30 bg-white/5'
      } ${isSoldOut ? 'opacity-50' : ''}`}
    >
      {popular && (
        <span className="absolute -top-3 left-4 px-3 py-1 bg-accent-orange text-white text-xs font-bold rounded-full">
          POPULAR
        </span>
      )}
      
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-white">{name}</h3>
          <p className="text-sm text-gray-400">{description}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-white">{price}</p>
          <p className="text-sm text-gray-400">{currency}</p>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <span className={`text-sm ${isSoldOut ? 'text-red-400' : 'text-gray-400'}`}>
          {isSoldOut ? 'Sold Out' : `${available} available`}
        </span>
        {!isSoldOut && (
          <Button 
            size="sm"
            className={`${
              popular 
                ? 'bg-accent-orange hover:bg-accent-orange/90' 
                : 'bg-white/10 hover:bg-white/20'
            } text-white`}
          >
            Select
          </Button>
        )}
      </div>
    </div>
  )
}

TicketCard.propTypes = {
  ticket: PropTypes.shape({
    name: PropTypes.string.isRequired,
    price: PropTypes.string.isRequired,
    currency: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    available: PropTypes.number.isRequired,
    total: PropTypes.number,
    popular: PropTypes.bool,
    features: PropTypes.arrayOf(PropTypes.string)
  }).isRequired
}

export default TicketCard
