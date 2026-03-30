/**
 * Mock event data for the Explore Events page (Issue #9)
 * Static UI-only implementation - data fetching to be added later
 */

export const mockEvents = [
  {
    id: "1",
    title: "Web3 Lagos Conference 2025",
    date: "March 15, 2025",
    time: "10:00 AM",
    location: "Landmark Event Centre, Lagos",
    category: "Conference",
    price: 50,
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=60",
    description: "Join the largest Web3 gathering in West Africa featuring industry leaders and innovators."
  },
  {
    id: "2",
    title: "Blockchain Developer Workshop",
    date: "March 20, 2025",
    time: "2:00 PM",
    location: "Tech Hub, Victoria Island",
    category: "Workshop",
    price: 25,
    image: "https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=800&auto=format&fit=crop&q=60",
    description: "Hands-on workshop covering smart contract development on Stellar/Soroban."
  },
  {
    id: "3",
    title: "Crypto Art Exhibition",
    date: "March 25, 2025",
    time: "6:00 PM",
    location: "Art Gallery, Ikoyi",
    category: "Exhibition",
    price: 15,
    image: "https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=800&auto=format&fit=crop&q=60",
    description: "Explore the intersection of art and blockchain technology with NFT artists."
  },
  {
    id: "4",
    title: "DeFi Masterclass",
    date: "April 2, 2025",
    time: "11:00 AM",
    location: "Online (Virtual)",
    category: "Workshop",
    price: 0,
    image: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&auto=format&fit=crop&q=60",
    description: "Learn the fundamentals of decentralized finance and yield strategies."
  },
  {
    id: "5",
    title: "Stellar Community Meetup",
    date: "April 8, 2025",
    time: "5:00 PM",
    location: "Co-Creation Hub, Yaba",
    category: "Meetup",
    price: 0,
    image: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&auto=format&fit=crop&q=60",
    description: "Connect with fellow Stellar enthusiasts and developers in Lagos."
  },
  {
    id: "6",
    title: "NFT Launch Party",
    date: "April 15, 2025",
    time: "8:00 PM",
    location: "Muri Okunola Park, Lagos",
    category: "Party",
    price: 30,
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=60",
    description: "Celebrate the launch of Africa's biggest NFT collection with music and networking."
  },
  {
    id: "7",
    title: "Women in Web3 Summit",
    date: "April 22, 2025",
    time: "9:00 AM",
    location: "Eko Hotels, Victoria Island",
    category: "Conference",
    price: 40,
    image: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&auto=format&fit=crop&q=60",
    description: "Empowering women leaders and builders in the blockchain ecosystem."
  },
  {
    id: "8",
    title: "Tokenbound Hackathon",
    date: "May 1-3, 2025",
    time: "9:00 AM",
    location: "Zone Tech Park, Gbagada",
    category: "Hackathon",
    price: 0,
    image: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&auto=format&fit=crop&q=60",
    description: "48-hour hackathon building innovative solutions with tokenbound accounts."
  },
  {
    id: "9",
    title: "Crypto Investment Seminar",
    date: "May 10, 2025",
    time: "3:00 PM",
    location: "Four Points by Sheraton, Lagos",
    category: "Seminar",
    price: 75,
    image: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&auto=format&fit=crop&q=60",
    description: "Expert insights on cryptocurrency investment strategies and market analysis."
  },
  {
    id: "10",
    title: "Soroban Smart Contract Bootcamp",
    date: "May 18, 2025",
    time: "10:00 AM",
    location: "Andela Learning Centre, Lagos",
    category: "Workshop",
    price: 35,
    image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=60",
    description: "Intensive bootcamp on building and deploying Soroban smart contracts."
  }
];

export const categories = [
  "All",
  "Conference",
  "Workshop",
  "Meetup",
  "Hackathon",
  "Exhibition",
  "Seminar",
  "Party"
];

export const sortOptions = [
  { value: "date", label: "Date" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
  { value: "name", label: "Name (A-Z)" }
];
