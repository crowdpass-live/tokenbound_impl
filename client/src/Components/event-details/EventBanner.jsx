import { Link } from 'react-router-dom'
import { Calendar, Clock, MapPin, ChevronLeft } from 'lucide-react'
import PropTypes from 'prop-types'

const EventBanner = ({ 
  title, 
  subtitle, 
  bannerUrl, 
  date, 
  day, 
  time, 
  city, 
  tags = [] 
}) => {
  return (
    <section className="relative pt-16">
      <div className="relative h-[400px] md:h-[500px] overflow-hidden">
        <img 
          src={bannerUrl} 
          alt={title}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-bg via-dark-bg/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-dark-bg/80 to-transparent" />
        
        {/* Back Button */}
        <Link 
          to="/" 
          className="absolute top-6 left-6 flex items-center gap-2 text-white/80 hover:text-white transition-colors bg-white/10 backdrop-blur-sm rounded-full px-4 py-2"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Back</span>
        </Link>
        
        {/* Banner Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
          <div className="max-w-7xl mx-auto">
            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-accent-orange text-white text-sm font-medium rounded-full">
                  {tags[0]}
                </span>
                {tags.slice(1, 4).map((tag, index) => (
                  <span 
                    key={index}
                    className="px-3 py-1 bg-white/10 backdrop-blur-sm text-white text-sm rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
              {title}
            </h1>
            
            <p className="text-lg md:text-xl text-gray-300 max-w-2xl mb-6">
              {subtitle}
            </p>
            
            <div className="flex flex-wrap items-center gap-6 text-white/80">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-accent-orange" />
                <span>{day}, {date}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-accent-orange" />
                <span>{time}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-accent-orange" />
                <span>{city}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

EventBanner.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string.isRequired,
  bannerUrl: PropTypes.string.isRequired,
  date: PropTypes.string.isRequired,
  day: PropTypes.string.isRequired,
  time: PropTypes.string.isRequired,
  city: PropTypes.string.isRequired,
  tags: PropTypes.arrayOf(PropTypes.string)
}

export default EventBanner
