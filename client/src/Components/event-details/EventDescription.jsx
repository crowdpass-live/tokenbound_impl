import PropTypes from 'prop-types'

const EventDescription = ({ description }) => {
  return (
    <section className="py-8 border-t border-white/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-white mb-6">Description</h2>
        <div className="text-gray-300 leading-relaxed space-y-4">
          {description.split('\n\n').map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </div>
    </section>
  )
}

EventDescription.propTypes = {
  description: PropTypes.string.isRequired
}

export default EventDescription
