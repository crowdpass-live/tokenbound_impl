import { useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Share2, 
  CalendarPlus, 
  Users, 
  Ticket,
  ChevronLeft,
  Heart,
  Star,
  ArrowRight
} from 'lucide-react'
import { Button } from '../../Components/shared/button'
import { Card } from '../../Components/shared/card'
import Footer from '../../Components/landing-page/footer'
import { 
  EventInfoCard, 
  TicketTypeCard, 
  ScheduleItem, 
  OrganizerCard,
  VenueCard 
} from '../../Components/event-details'

// Static sample event data
const sampleEvent = {
  id: "stellar-hackathon-2026",
  title: "Stellar Hackathon 2026",
  subtitle: "Build the Future of Decentralized Finance",
  bannerUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1920&q=80",
  date: "March 15, 2026",
  time: "10:00 AM - 6:00 PM WAT",
  location: "Landmark Event Centre, Lagos, Nigeria",
  city: "Lagos, Nigeria",
  venue: {
    name: "Landmark Event Centre",
    address: "Plot 2 & 3, Water Corporation Drive, Victoria Island",
    city: "Lagos, Nigeria",
    mapImageUrl: "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&q=80",
    additionalInfo: "Parking available on-site. Closest bus stop: Water Corporation Road."
  },
  description: `Join us for the most anticipated blockchain hackathon in Africa! The Stellar Hackathon 2026 brings together developers, designers, and blockchain enthusiasts from across the continent to build innovative solutions on the Stellar network.

Whether you're a seasoned developer or just getting started with blockchain, this is your chance to learn, build, and compete for amazing prizes. Work alongside industry experts, gain hands-on experience with Soroban smart contracts, and connect with the vibrant Web3 community.

**What to Expect:**
- 8 hours of intensive coding and collaboration
- Mentorship from Stellar Foundation engineers
- Workshops on Soroban smart contract development
- Networking opportunities with leading Web3 companies
- Amazing prizes for top projects
- Free meals and refreshments throughout the event`,
  
  attendees: 500,
  ticketsSold: 347,
  totalTickets: 500,
  
  organizer: {
    name: "CrowdPass Events",
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&q=80",
    description: "CrowdPass is the leading decentralized event ticketing platform on Stellar, empowering organizers to create fraud-proof, transparent events.",
    email: "events@crowdpass.live",
    website: "https://crowdpass.live",
    twitter: "crowdpass_live",
    eventsHosted: 42
  },
  
  schedule: [
    {
      time: "09:00 AM",
      title: "Registration & Check-in",
      description: "Get your badge, grab some coffee, and meet fellow hackers"
    },
    {
      time: "10:00 AM",
      title: "Opening Ceremony",
      speaker: "Dr. Amara Okonkwo, Stellar Foundation",
      description: "Welcome address and hackathon rules overview"
    },
    {
      time: "10:30 AM",
      title: "Workshop: Intro to Soroban",
      speaker: "Emmanuel Adebayo, Senior Developer",
      description: "Hands-on introduction to building smart contracts on Stellar"
    },
    {
      time: "12:00 PM",
      title: "Lunch Break",
      description: "Networking lunch with mentors and sponsors"
    },
    {
      time: "01:00 PM",
      title: "Hacking Begins!",
      description: "Form teams and start building your projects"
    },
    {
      time: "05:00 PM",
      title: "Project Submissions",
      description: "Submit your projects for judging"
    },
    {
      time: "05:30 PM",
      title: "Demo Presentations",
      description: "Top teams present their projects to the judges"
    },
    {
      time: "06:00 PM",
      title: "Awards & Closing",
      speaker: "Panel of Judges",
      description: "Winners announced and prizes distributed"
    }
  ],
  
  ticketTypes: [
    {
      name: "Early Bird",
      price: "25",
      currency: "STRK",
      description: "Limited availability - act fast!",
      features: [
        "Full event access",
        "Lunch & refreshments",
        "Exclusive swag bag",
        "Certificate of participation"
      ],
      isSoldOut: true
    },
    {
      name: "General Admission",
      price: "50",
      currency: "STRK",
      description: "Standard entry to the hackathon",
      features: [
        "Full event access",
        "Lunch & refreshments",
        "Event swag",
        "Certificate of participation",
        "Workshop materials"
      ],
      isPopular: true
    },
    {
      name: "VIP Experience",
      price: "150",
      currency: "STRK",
      description: "Premium hackathon experience",
      features: [
        "Priority check-in",
        "Reserved seating",
        "Premium lunch menu",
        "Exclusive networking session",
        "1-on-1 mentorship slot",
        "Premium swag bundle",
        "Post-event dinner invitation"
      ]
    }
  ],
  
  tags: ["Blockchain", "Hackathon", "Stellar", "Web3", "Soroban", "DeFi"],
  
  highlights: [
    { icon: Users, label: "Expected Attendees", value: "500+" },
    { icon: Star, label: "Prize Pool", value: "$50,000" },
    { icon: Ticket, label: "Tickets Remaining", value: "153" }
  ]
}

const StaticEventDetailsPage = () => {
  const [isLiked, setIsLiked] = useState(false)
  const [showFullDescription, setShowFullDescription] = useState(false)
  
  // Use static sample data
  const event = sampleEvent
  
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: event.title,
        text: event.subtitle,
        url: window.location.href,
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('Link copied to clipboard!')
    }
  }
  
  const handleAddToCalendar = () => {
    // Generate Google Calendar link
    const startDate = "20260315T100000"
    const endDate = "20260315T180000"
    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${startDate}/${endDate}&details=${encodeURIComponent(event.description.slice(0, 200))}&location=${encodeURIComponent(event.location)}`
    window.open(calendarUrl, '_blank')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2 text-deep-blue dark:text-white hover:text-primary transition-colors">
                <ChevronLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Back to Events</span>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsLiked(!isLiked)}
                className={`p-2 rounded-full transition-colors ${isLiked ? 'bg-red-100 text-red-500' : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 hover:text-red-500'}`}
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
              </button>
              <button 
                onClick={handleShare}
                className="p-2 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-500 hover:text-primary transition-colors"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Banner Section */}
      <section className="relative h-[50vh] min-h-[400px] max-h-[600px]">
        <img 
          src={event.bannerUrl} 
          alt={event.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        
        {/* Banner Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 lg:p-12">
          <div className="max-w-7xl mx-auto">
            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-4">
              {event.tags.slice(0, 4).map((tag, index) => (
                <span 
                  key={index}
                  className="px-3 py-1 text-xs font-medium bg-primary/20 text-primary rounded-full backdrop-blur-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
            
            {/* Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-3">
              {event.title}
            </h1>
            <p className="text-lg sm:text-xl text-gray-200 mb-6 max-w-2xl">
              {event.subtitle}
            </p>
            
            {/* Quick Info */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-white/90">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <span>{event.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                <span>{event.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                <span>{event.city}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column - Event Details */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Event Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 -mt-16 relative z-10">
              <EventInfoCard 
                icon={Calendar}
                label="Date"
                value={event.date}
                className="shadow-lg"
              />
              <EventInfoCard 
                icon={Clock}
                label="Time"
                value={event.time}
                className="shadow-lg"
              />
              <EventInfoCard 
                icon={MapPin}
                label="Location"
                value={event.city}
                className="shadow-lg"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={handleAddToCalendar}
                variant="outline" 
                className="border-deep-blue text-deep-blue hover:bg-deep-blue hover:text-white flex items-center gap-2"
              >
                <CalendarPlus className="w-4 h-4" />
                Add to Calendar
              </Button>
              <Button 
                onClick={handleShare}
                variant="outline" 
                className="border-deep-blue text-deep-blue hover:bg-deep-blue hover:text-white flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share Event
              </Button>
            </div>

            {/* Description Section */}
            <Card className="p-6 bg-white dark:bg-zinc-800 rounded-2xl shadow-lg">
              <h2 className="text-2xl font-bold text-deep-blue dark:text-white mb-4">
                About This Event
              </h2>
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <p className={`text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed ${!showFullDescription ? 'line-clamp-6' : ''}`}>
                  {event.description}
                </p>
                <button 
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  className="mt-3 text-primary font-medium hover:underline flex items-center gap-1"
                >
                  {showFullDescription ? 'Show Less' : 'Read More'}
                  <ArrowRight className={`w-4 h-4 transition-transform ${showFullDescription ? 'rotate-90' : ''}`} />
                </button>
              </div>
            </Card>

            {/* Event Highlights */}
            <div className="grid grid-cols-3 gap-4">
              {event.highlights.map((highlight, index) => (
                <div 
                  key={index}
                  className="text-center p-4 bg-gradient-to-br from-deep-blue to-deep-blue/80 rounded-xl"
                >
                  <highlight.icon className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{highlight.value}</p>
                  <p className="text-sm text-gray-300">{highlight.label}</p>
                </div>
              ))}
            </div>

            {/* Schedule Section */}
            <Card className="p-6 bg-white dark:bg-zinc-800 rounded-2xl shadow-lg">
              <h2 className="text-2xl font-bold text-deep-blue dark:text-white mb-6">
                Event Schedule
              </h2>
              <div className="space-y-3">
                {event.schedule.map((item, index) => (
                  <ScheduleItem 
                    key={index}
                    time={item.time}
                    title={item.title}
                    speaker={item.speaker}
                    description={item.description}
                    isActive={index === 1}
                  />
                ))}
              </div>
            </Card>

            {/* Venue Section */}
            <div>
              <h2 className="text-2xl font-bold text-deep-blue dark:text-white mb-4">
                Venue
              </h2>
              <VenueCard 
                name={event.venue.name}
                address={event.venue.address}
                city={event.venue.city}
                mapImageUrl={event.venue.mapImageUrl}
                additionalInfo={event.venue.additionalInfo}
              />
            </div>

            {/* Organizer Section */}
            <div>
              <h2 className="text-2xl font-bold text-deep-blue dark:text-white mb-4">
                Organized By
              </h2>
              <OrganizerCard 
                name={event.organizer.name}
                image={event.organizer.image}
                description={event.organizer.description}
                email={event.organizer.email}
                website={event.organizer.website}
                twitter={event.organizer.twitter}
                eventsHosted={event.organizer.eventsHosted}
              />
            </div>
          </div>

          {/* Right Column - Tickets */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <h2 className="text-2xl font-bold text-deep-blue dark:text-white">
                Select Tickets
              </h2>
              
              {/* Ticket Types */}
              <div className="space-y-4">
                {event.ticketTypes.map((ticket, index) => (
                  <TicketTypeCard 
                    key={index}
                    name={ticket.name}
                    price={ticket.price}
                    currency={ticket.currency}
                    description={ticket.description}
                    features={ticket.features}
                    isPopular={ticket.isPopular}
                    isSoldOut={ticket.isSoldOut}
                  />
                ))}
              </div>

              {/* Ticket Progress */}
              <Card className="p-4 bg-white dark:bg-zinc-800 rounded-xl">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Tickets Sold</span>
                  <span className="text-sm font-medium text-deep-blue dark:text-white">
                    {event.ticketsSold} / {event.totalTickets}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-active-green rounded-full transition-all"
                    style={{ width: `${(event.ticketsSold / event.totalTickets) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {event.totalTickets - event.ticketsSold} tickets remaining
                </p>
              </Card>

              {/* Mobile CTA */}
              <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 shadow-lg z-40">
                <Button className="w-full bg-primary text-deep-blue hover:bg-primary/90 font-bold py-4 text-lg">
                  Get Tickets
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}

export default StaticEventDetailsPage
