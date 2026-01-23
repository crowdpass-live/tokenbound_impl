import PropTypes from 'prop-types'

const EventFooter = ({ logoSrc = "/assets/hostit-logo-light.png" }) => {
  return (
    <footer className="border-t border-white/10 mt-16 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <img src={logoSrc} alt="CrowdPass" className="h-8" />
          <p className="text-gray-500 text-sm">© 2026 CrowdPass. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-gray-400 hover:text-white transition-colors">
              <img src="/assets/x-icon.png" alt="X" className="w-5 h-5 opacity-60 hover:opacity-100" />
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">
              <img src="/assets/instagram-icon.png" alt="Instagram" className="w-5 h-5 opacity-60 hover:opacity-100" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

EventFooter.propTypes = {
  logoSrc: PropTypes.string
}

export default EventFooter
