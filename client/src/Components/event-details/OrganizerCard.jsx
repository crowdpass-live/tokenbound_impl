import PropTypes from 'prop-types'
import { cn } from '../../lib/utils'
import { User, Mail, Globe, Twitter } from 'lucide-react'

const OrganizerCard = ({ 
  name, 
  image, 
  description, 
  email, 
  website, 
  twitter, 
  eventsHosted,
  className 
}) => {
  return (
    <div className={cn(
      "flex flex-col sm:flex-row gap-6 p-6 bg-white dark:bg-zinc-800 rounded-2xl shadow-lg border border-gray-100 dark:border-zinc-700",
      className
    )}>
      <div className="flex-shrink-0">
        {image ? (
          <img 
            src={image} 
            alt={name}
            className="w-24 h-24 rounded-full object-cover border-4 border-primary/20"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-deep-blue/10 flex items-center justify-center">
            <User className="w-12 h-12 text-deep-blue dark:text-primary" />
          </div>
        )}
      </div>
      
      <div className="flex-grow">
        <div className="flex items-center gap-3 mb-2">
          <h3 className="text-xl font-bold text-deep-blue dark:text-white">{name}</h3>
          <span className="px-3 py-1 text-xs font-medium bg-active-green/10 text-active-green rounded-full">
            Verified Organizer
          </span>
        </div>
        
        {description && (
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">{description}</p>
        )}
        
        <div className="flex flex-wrap gap-4 text-sm">
          {eventsHosted && (
            <span className="text-gray-500 dark:text-gray-400">
              <strong className="text-deep-blue dark:text-white">{eventsHosted}</strong> events hosted
            </span>
          )}
          
          {email && (
            <a href={`mailto:${email}`} className="flex items-center gap-1 text-gray-500 hover:text-primary transition-colors">
              <Mail className="w-4 h-4" />
              <span>Contact</span>
            </a>
          )}
          
          {website && (
            <a href={website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-gray-500 hover:text-primary transition-colors">
              <Globe className="w-4 h-4" />
              <span>Website</span>
            </a>
          )}
          
          {twitter && (
            <a href={`https://twitter.com/${twitter}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-gray-500 hover:text-primary transition-colors">
              <Twitter className="w-4 h-4" />
              <span>@{twitter}</span>
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

OrganizerCard.propTypes = {
  name: PropTypes.string.isRequired,
  image: PropTypes.string,
  description: PropTypes.string,
  email: PropTypes.string,
  website: PropTypes.string,
  twitter: PropTypes.string,
  eventsHosted: PropTypes.number,
  className: PropTypes.string
}

export default OrganizerCard
