import PropTypes from 'prop-types'

const EventTabs = ({ activeTab, onTabChange, tabs = ['about', 'schedule', 'venue'] }) => {
  return (
    <div className="flex gap-2 border-b border-white/10 pb-4">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={`px-6 py-2 rounded-full font-medium transition-all ${
            activeTab === tab 
              ? 'bg-accent-orange text-white' 
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          {tab.charAt(0).toUpperCase() + tab.slice(1)}
        </button>
      ))}
    </div>
  )
}

EventTabs.propTypes = {
  activeTab: PropTypes.string.isRequired,
  onTabChange: PropTypes.func.isRequired,
  tabs: PropTypes.arrayOf(PropTypes.string)
}

export default EventTabs
