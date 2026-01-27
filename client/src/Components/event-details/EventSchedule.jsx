import { Star } from 'lucide-react'
import PropTypes from 'prop-types'

const ScheduleItem = ({ time, title, speaker, type }) => {
  const getItemStyles = () => {
    switch (type) {
      case 'keynote':
        return 'bg-accent-orange/10 border border-accent-orange/30'
      case 'break':
        return 'bg-white/5'
      default:
        return 'bg-white/5 hover:bg-white/10'
    }
  }

  return (
    <div className={`flex gap-4 p-4 rounded-xl transition-all ${getItemStyles()}`}>
      <div className="flex-shrink-0 w-20">
        <span className={`text-sm font-bold ${
          type === 'keynote' ? 'text-accent-orange' : 'text-gray-400'
        }`}>
          {time}
        </span>
      </div>
      <div className="flex-grow">
        <h4 className="font-semibold text-white">{title}</h4>
        {speaker && (
          <p className="text-sm text-accent-orange mt-1">{speaker}</p>
        )}
      </div>
      {type === 'keynote' && (
        <div className="flex-shrink-0">
          <Star className="w-5 h-5 text-accent-orange" />
        </div>
      )}
    </div>
  )
}

ScheduleItem.propTypes = {
  time: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  speaker: PropTypes.string,
  type: PropTypes.oneOf(['general', 'keynote', 'workshop', 'break', 'main', 'deadline', 'presentation'])
}

const EventSchedule = ({ schedule }) => {
  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Event Schedule</h2>
      <div className="space-y-4">
        {schedule.map((item, index) => (
          <ScheduleItem 
            key={index}
            time={item.time}
            title={item.title}
            speaker={item.speaker}
            type={item.type}
          />
        ))}
      </div>
    </div>
  )
}

EventSchedule.propTypes = {
  schedule: PropTypes.arrayOf(
    PropTypes.shape({
      time: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      speaker: PropTypes.string,
      type: PropTypes.string
    })
  ).isRequired
}

export default EventSchedule
