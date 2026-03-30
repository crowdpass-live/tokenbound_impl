import { useState, useMemo } from 'react'
import Layout from '../../Components/dashboard/layout'
import ExploreEventCard from '../../Components/dashboard/explore-event-card'
import { mockEvents, categories, sortOptions } from '../../lib/mock-events'
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, Calendar, DollarSign } from 'lucide-react'

const Discover = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [sortBy, setSortBy] = useState('date')
  const [showFilters, setShowFilters] = useState(false)
  
  // Advanced filters
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 6

  // Filter events based on search, category, price, and date
  const filteredEvents = useMemo(() => {
    return mockEvents.filter(event => {
      const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesCategory = selectedCategory === 'All' || event.category === selectedCategory
      
      const price = event.price || 0
      const matchesPrice = (minPrice === '' || price >= Number(minPrice)) &&
                          (maxPrice === '' || price <= Number(maxPrice))
      
      const eventDate = new Date(event.date)
      const matchesDate = (startDate === '' || eventDate >= new Date(startDate)) &&
                         (endDate === '' || eventDate <= new Date(endDate))

      return matchesSearch && matchesCategory && matchesPrice && matchesDate
    })
  }, [searchQuery, selectedCategory, minPrice, maxPrice, startDate, endDate])

  // Sort events
  const sortedEvents = useMemo(() => {
    return [...filteredEvents].sort((a, b) => {
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
  }, [filteredEvents, sortBy])

  // Pagination logic
  const totalPages = Math.ceil(sortedEvents.length / itemsPerPage)
  const paginatedEvents = sortedEvents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handlePageChange = (page) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

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
          <div className="flex flex-col lg:flex-row gap-4">
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
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-deep-blue placeholder-gray-400"
                aria-label="Search events"
              />
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-2">
              {/* Sort Dropdown */}
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

              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-3 border border-gray-300 rounded-lg bg-white text-deep-blue flex items-center gap-2 hover:bg-gray-50 transition-colors"
                aria-label="Toggle filters"
                aria-expanded={showFilters}
              >
                <SlidersHorizontal className="w-5 h-5" />
                <span className="hidden sm:inline">Filters</span>
              </button>
            </div>
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-200">
              {/* Price Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <DollarSign className="w-4 h-4" /> Price Range
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => {
                      setMinPrice(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => {
                      setMaxPrice(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>

              {/* Date Start */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <Calendar className="w-4 h-4" /> From Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              {/* Date End */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <Calendar className="w-4 h-4" /> To Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              {/* Clear Controls */}
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setMinPrice('')
                    setMaxPrice('')
                    setStartDate('')
                    setEndDate('')
                    setSelectedCategory('All')
                    setSearchQuery('')
                    setCurrentPage(1)
                  }}
                  className="text-sm text-primary hover:underline font-medium p-2"
                >
                  Reset all filters
                </button>
              </div>
            </div>
          )}

          {/* Category Filter Chips */}
          <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => {
                  setSelectedCategory(category)
                  setCurrentPage(1)
                }}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                  selectedCategory === category
                    ? 'bg-deep-blue text-primary shadow-md'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-primary hover:text-primary'
                }`}
                aria-pressed={selectedCategory === category}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Results Info */}
        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <div className="text-sm text-gray-600">
            Showing <span className="font-semibold text-deep-blue">{paginatedEvents.length}</span> of <span className="font-semibold text-deep-blue">{sortedEvents.length}</span> event{sortedEvents.length !== 1 ? 's' : ''}
          </div>
          {totalPages > 1 && (
            <div className="text-xs text-gray-400 capitalize">
              Page {currentPage} of {totalPages}
            </div>
          )}
        </div>

        {/* Events Grid */}
        {paginatedEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
            {paginatedEvents.map((event) => (
              <ExploreEventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-2xl border border-dashed border-gray-300">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
              <Search className="w-10 h-10 text-gray-300" aria-hidden="true" />
            </div>
            <h3 className="text-xl font-semibold text-deep-blue mb-2">
              No results match your criteria
            </h3>
            <p className="text-gray-500 max-w-sm px-4">
              Try adjusting your search terms or filters to broaden your search results.
            </p>
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedCategory('All')
                setMinPrice('')
                setMaxPrice('')
                setStartDate('')
                setEndDate('')
                setCurrentPage(1)
              }}
              className="mt-6 px-8 py-3 bg-deep-blue text-primary rounded-xl font-bold hover:shadow-lg transition-all duration-200"
            >
              Clear All Filters
            </button>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 pt-8 pb-12">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50 transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="flex gap-1">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => handlePageChange(i + 1)}
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                    currentPage === i + 1
                      ? 'bg-deep-blue text-primary shadow-md'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-primary'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50 transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default Discover
