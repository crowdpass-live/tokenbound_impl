import PropTypes from 'prop-types'
import { cn } from '../../lib/utils'
import { Button } from '../shared/button'
import { Check } from 'lucide-react'

const TicketTypeCard = ({ 
  name, 
  price, 
  currency = "STRK", 
  description, 
  features = [], 
  isPopular = false,
  isSoldOut = false,
  className 
}) => {
  return (
    <div className={cn(
      "relative flex flex-col p-6 bg-white dark:bg-zinc-800 rounded-2xl shadow-lg border-2 transition-all hover:shadow-xl",
      isPopular ? "border-primary" : "border-gray-100 dark:border-zinc-700",
      isSoldOut && "opacity-60",
      className
    )}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-deep-blue text-xs font-bold px-4 py-1 rounded-full">
            MOST POPULAR
          </span>
        </div>
      )}
      
      <div className="mb-4">
        <h3 className="text-xl font-bold text-deep-blue dark:text-white">{name}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
      </div>
      
      <div className="flex items-baseline gap-1 mb-6">
        <span className="text-4xl font-bold text-deep-blue dark:text-white">{price}</span>
        <span className="text-lg text-gray-500 dark:text-gray-400">{currency}</span>
      </div>
      
      <ul className="flex-grow space-y-3 mb-6">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center gap-3">
            <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-300">{feature}</span>
          </li>
        ))}
      </ul>
      
      <Button 
        className={cn(
          "w-full py-3 font-semibold transition-colors",
          isPopular 
            ? "bg-primary text-deep-blue hover:bg-primary/90" 
            : "bg-deep-blue text-white hover:bg-deep-blue/90",
          isSoldOut && "cursor-not-allowed"
        )}
        disabled={isSoldOut}
      >
        {isSoldOut ? "Sold Out" : "Get Ticket"}
      </Button>
    </div>
  )
}

TicketTypeCard.propTypes = {
  name: PropTypes.string.isRequired,
  price: PropTypes.string.isRequired,
  currency: PropTypes.string,
  description: PropTypes.string,
  features: PropTypes.arrayOf(PropTypes.string),
  isPopular: PropTypes.bool,
  isSoldOut: PropTypes.bool,
  className: PropTypes.string
}

export default TicketTypeCard
