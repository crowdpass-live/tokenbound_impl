import { Link } from 'react-router-dom'
import { Button } from '../shared/button'
import PropTypes from 'prop-types'

const EventHeader = ({ logoSrc = "/assets/hostit-logo-light.png" }) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-dark-bg/95 backdrop-blur-sm border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoSrc} alt="CrowdPass" className="h-8" />
          </Link>
          
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/discover" className="text-gray-300 hover:text-white transition-colors">
              Discover
            </Link>
            <Link to="/events" className="text-gray-300 hover:text-white transition-colors">
              My Events
            </Link>
            <Link to="/tickets" className="text-gray-300 hover:text-white transition-colors">
              My Tickets
            </Link>
          </nav>
          
          <div className="flex items-center gap-4">
            <Button className="bg-accent-orange hover:bg-accent-orange/90 text-white font-semibold px-6">
              Connect Wallet
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}

EventHeader.propTypes = {
  logoSrc: PropTypes.string
}

export default EventHeader
