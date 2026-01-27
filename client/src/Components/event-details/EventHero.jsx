import { Calendar, Share2, Bookmark } from 'lucide-react'
import { Button } from '../shared/button'
import PropTypes from 'prop-types'

const EventHero = ({ 
  title, 
  type = "PAID",
  bannerUrl, 
  date, 
  time,
  attendees = [],
  stats = {},
  onShare,
  onBookmark
}) => {
  return (
    <section className="py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left - Event Image */}
          <div className="relative rounded-2xl overflow-hidden aspect-[4/3]">
            <img 
              src={bannerUrl} 
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Right - Event Info */}
          <div className="flex flex-col gap-4">
            {/* Event Type Badge */}
            <span className="inline-block w-fit px-3 py-1 bg-accent-orange text-white text-sm font-semibold rounded">
              {type}
            </span>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight">
              {title}
            </h1>

            {/* Date & Time */}
            <div className="flex items-center gap-3 bg-[#2a2a2a] rounded-lg px-4 py-3 w-fit">
              <div className="w-10 h-10 bg-accent-orange rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-medium">{date}</p>
                <p className="text-gray-400 text-sm">{time}</p>
              </div>
            </div>

            {/* Attendees */}
            <div className="flex items-center gap-4">
              <div className="flex -space-x-3">
                {attendees.slice(0, 4).map((attendee, index) => (
                  <img 
                    key={index}
                    src={attendee.avatar} 
                    alt={attendee.name || 'Attendee'}
                    className="w-10 h-10 rounded-full border-2 border-dark-bg object-cover"
                  />
                ))}
                {attendees.length > 4 && (
                  <div className="w-10 h-10 rounded-full border-2 border-dark-bg bg-accent-orange flex items-center justify-center">
                    <span className="text-white text-xs font-bold">+{attendees.length - 4}</span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-white font-medium">Participants</p>
                <p className="text-gray-400 text-sm">Across the globe</p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-2 text-gray-400 text-sm flex-wrap">
              {stats.speakers && (
                <>
                  <span className="text-white font-medium">{stats.speakers}</span>
                  <span className="text-accent-orange">•</span>
                </>
              )}
              {stats.sponsors && (
                <>
                  <span className="text-white font-medium">{stats.sponsors}</span>
                  <span className="text-accent-orange">•</span>
                </>
              )}
              {stats.workshops && (
                <span className="text-white font-medium">{stats.workshops}</span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-4 mt-4">
              <button 
                onClick={onShare}
                className="p-3 rounded-lg bg-[#2a2a2a] text-gray-400 hover:text-white hover:bg-[#3a3a3a] transition-colors"
              >
                <Share2 className="w-5 h-5" />
              </button>
              <button 
                onClick={onBookmark}
                className="p-3 rounded-lg bg-[#2a2a2a] text-gray-400 hover:text-white hover:bg-[#3a3a3a] transition-colors"
              >
                <Bookmark className="w-5 h-5" />
              </button>
              <Button className="flex-1 bg-accent-orange hover:bg-accent-orange/90 text-white font-semibold py-3 px-8 rounded-lg">
                Register
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

EventHero.propTypes = {
  title: PropTypes.string.isRequired,
  type: PropTypes.string,
  bannerUrl: PropTypes.string.isRequired,
  date: PropTypes.string.isRequired,
  time: PropTypes.string.isRequired,
  attendees: PropTypes.arrayOf(PropTypes.shape({
    avatar: PropTypes.string,
    name: PropTypes.string
  })),
  stats: PropTypes.shape({
    speakers: PropTypes.string,
    sponsors: PropTypes.string,
    workshops: PropTypes.string
  }),
  onShare: PropTypes.func,
  onBookmark: PropTypes.func
}

export default EventHero
