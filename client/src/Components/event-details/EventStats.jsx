import PropTypes from 'prop-types'

const EventStats = ({ stats }) => {
  return (
    <div className="grid grid-cols-3 gap-4">
      {stats.map((stat, index) => {
        const IconComponent = stat.icon
        return (
          <div 
            key={index}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 text-center"
          >
            <IconComponent className="w-8 h-8 text-accent-orange mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-sm text-gray-400">{stat.label}</p>
          </div>
        )
      })}
    </div>
  )
}

EventStats.propTypes = {
  stats: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
      icon: PropTypes.elementType.isRequired
    })
  ).isRequired
}

export default EventStats
