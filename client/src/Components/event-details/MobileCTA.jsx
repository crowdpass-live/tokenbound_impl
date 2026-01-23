import { Button } from '../shared/button'
import PropTypes from 'prop-types'

const MobileCTA = ({ priceRange }) => {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-dark-bg/95 backdrop-blur-sm border-t border-white/10 z-40">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-400">Starting from</p>
          <p className="text-xl font-bold text-white">{priceRange} STRK</p>
        </div>
        <Button className="flex-1 max-w-[200px] bg-accent-orange hover:bg-accent-orange/90 text-white font-bold py-3">
          Get Tickets
        </Button>
      </div>
    </div>
  )
}

MobileCTA.propTypes = {
  priceRange: PropTypes.string.isRequired
}

export default MobileCTA
