import { useState } from 'react'
import Layout from '../../Components/dashboard/layout'
import ExploreEventCard from '../../Components/dashboard/explore-event-card'
import { mockEvents, categories, sortOptions } from '../../lib/mock-events'
import { Search, SlidersHorizontal } from 'lucide-react'

const Discover = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [sortBy, setSortBy] = useState('date')
  const [showFilters, setShowFilters] = useState(false)

  // Filter events based on search and category (UI-only, static filtering)
  const filteredEvents = mockEvents.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || event.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Sort events (UI-only, static sorting)
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return a.price - b.price
      case 'price-high':
        return b.price - a.price
      case 'name':
        return a.title.localeCompare(b.title)
      case 'date':
      default:
        return new Date(a.date) - new Date(b.date)
    }
  })

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-deep-blue">
            Explore Events
          </h1>
          <p className="text-gray-600">
            Discover upcoming events, workshops, and experiences in the Web3 ecosystem
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                aria-hidden="true"
              />
              <input
                type="text"
                placeholder="Search events by name, location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-deep-blue placeholder-gray-400"
                aria-label="Search events"
              />
            </div>

            {/* Sort Dropdown */}
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-deep-blue cursor-pointer"
                aria-label="Sort events"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {/* Mobile Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="sm:hidden px-4 py-3 border border-gray-300 rounded-lg bg-white text-deep-blue flex items-center gap-2"
                aria-label="Toggle filters"
                aria-expanded={showFilters}
              >
                <SlidersHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className={`flex flex-wrap gap-2 ${showFilters ? 'block' : 'hidden sm:flex'}`}>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  selectedCategory === category
                    ? 'bg-deep-blue text-primary'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                aria-pressed={selectedCategory === category}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Results Count */}
        <div className="text-sm text-gray-600">
          Showing <span className="font-semibold text-deep-blue">{sortedEvents.length}</span> event{sortedEvents.length !== 1 ? 's' : ''}
          {selectedCategory !== 'All' && (
            <span> in <span className="font-semibold text-deep-blue">{selectedCategory}</span></span>
          )}
          {searchQuery && (
            <span> matching &quot;<span className="font-semibold text-deep-blue">{searchQuery}</span>&quot;</span>
          )}
        </div>

        {/* Events Grid */}
        {sortedEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedEvents.map((event) => (
              <ExploreEventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Search className="w-10 h-10 text-gray-400" aria-hidden="true" />
            </div>
            <h3 className="text-xl font-semibold text-deep-blue mb-2">
              No events found
            </h3>
            <p className="text-gray-500 max-w-md">
              Try adjusting your search or filter criteria to find what you&apos;re looking for.
            </p>
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedCategory('All')
              }}
              className="mt-4 px-6 py-2 bg-deep-blue text-primary rounded-lg hover:bg-primary hover:text-deep-blue transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default Discover
