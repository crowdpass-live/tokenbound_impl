import { 
  EventHeader, 
  EventHero, 
  EventDescription, 
  LocationCard, 
  SchedulePanel 
} from '../../Components/event-details'

// Static sample event data matching Figma design
const sampleEvent = {
  id: "developers-conference-24",
  title: "Developer's Conference 24",
  type: "PAID",
  date: "Sat, 7th November, 2024",
  time: "9:00AM - 5:00PM",
  imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80",
  
  speakers: "445+",
  sponsors: "20+",
  workshops: "21+",
  
  venue: "The Zone Tech Park",
  address: "Gbagada, Lagos, Nigeria",
  
  description: `Join us for an extraordinary day of innovation, networking, and learning at Developer's Conference 24. This premier tech event brings together the brightest minds in software development, blockchain technology, and emerging tech.

Whether you're a seasoned developer or just starting your journey, this conference offers invaluable insights into the latest industry trends, best practices, and cutting-edge technologies shaping our digital future. Connect with industry leaders, participate in hands-on workshops, and discover new opportunities to advance your career.

Don't miss this chance to be part of a vibrant community of innovators and creators pushing the boundaries of what's possible in technology.`,
  
  attendees: [
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80",
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80"
  ],
  
  schedule: [
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
}

const StaticEventDetailsPage = () => {
  const event = sampleEvent

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Navigation Header */}
      <EventHeader />
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section - Image Left, Info Right */}
        <EventHero 
          title={event.title}
          type={event.type}
          date={event.date}
          time={event.time}
          speakers={event.speakers}
          sponsors={event.sponsors}
          workshops={event.workshops}
          imageUrl={event.imageUrl}
          attendees={event.attendees}
        />
        
        {/* Description Section */}
        <div className="mt-12">
          <EventDescription description={event.description} />
        </div>
        
        {/* Location & Schedule Section */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8 pb-24 lg:pb-8">
          {/* Location Card - Left */}
          <LocationCard 
            venue={event.venue}
            address={event.address}
          />
          
          {/* Schedule Panel - Right */}
          <SchedulePanel scheduleItems={event.schedule} />
        </div>
      </main>
      
      {/* Mobile Fixed CTA */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-dark-bg border-t border-gray-800 p-4 z-50">
        <button className="w-full bg-accent-orange hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors">
          Register Now
        </button>
      </div>
    </div>
  )
}

export default StaticEventDetailsPage
