import { useState } from 'react'
import PropTypes from 'prop-types'

const SchedulePanel = ({ scheduleItems }) => {
  const [activeTab, setActiveTab] = useState('Schedule')
  
  const tabs = ['Schedule', 'Tickets', 'Workshops', 'Speakers']
  
  const defaultSchedule = [
    {
      time: "9:00AM - 10:00AM",
      title: "Registration & Networking",
      description: "Check-in, collect your badge, and connect with fellow attendees"
    },
    {
      time: "10:00AM - 11:30AM", 
      title: "Keynote: Future of Web3",
      description: "Opening keynote discussing the latest trends and innovations in Web3"
    },
    {
      time: "11:30AM - 12:30PM",
      title: "Panel: DeFi Revolution",
      description: "Industry experts discuss the evolution of decentralized finance"
    },
    {
      time: "12:30PM - 1:30PM",
      title: "Lunch Break",
      description: "Enjoy lunch and continue networking with speakers and attendees"
    },
    {
      time: "1:30PM - 3:00PM",
      title: "Workshop: Smart Contract Development",
      description: "Hands-on session building and deploying smart contracts"
    }
  ]
  
  const schedule = scheduleItems?.length > 0 ? scheduleItems : defaultSchedule
  
  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === tab 
                ? 'bg-accent-orange text-white' 
                : 'bg-transparent text-gray-400 border border-gray-600 hover:border-gray-400'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      
      {/* Schedule Content */}
      {activeTab === 'Schedule' && (
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {schedule.map((item, index) => (
            <div 
              key={index}
              className="bg-[#2a2a2a] rounded-xl p-4"
            >
              <div className="text-accent-orange text-sm font-medium mb-1">
                {item.time}
              </div>
              <h4 className="text-white font-semibold mb-1">{item.title}</h4>
              <p className="text-gray-400 text-sm">{item.description}</p>
            </div>
          ))}
        </div>
      )}
      
      {/* Placeholder for other tabs */}
      {activeTab === 'Tickets' && (
        <div className="bg-[#2a2a2a] rounded-xl p-6 text-center">
          <p className="text-gray-400">Ticket information coming soon</p>
        </div>
      )}
      
      {activeTab === 'Workshops' && (
        <div className="bg-[#2a2a2a] rounded-xl p-6 text-center">
          <p className="text-gray-400">Workshop details coming soon</p>
        </div>
      )}
      
      {activeTab === 'Speakers' && (
        <div className="bg-[#2a2a2a] rounded-xl p-6 text-center">
          <p className="text-gray-400">Speaker lineup coming soon</p>
        </div>
      )}
    </div>
  )
}

SchedulePanel.propTypes = {
  scheduleItems: PropTypes.arrayOf(
    PropTypes.shape({
      time: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired
    })
  )
}

export default SchedulePanel
