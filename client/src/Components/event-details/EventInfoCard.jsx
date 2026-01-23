import PropTypes from 'prop-types'
import { cn } from '../../lib/utils'

const EventInfoCard = ({ icon: Icon, label, value, className }) => {
  return (
    <div className={cn(
      "flex items-center gap-4 p-4 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-700 hover:shadow-md transition-shadow",
      className
    )}>
      <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-primary/10">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <div className="flex flex-col">
        <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{label}</span>
        <span className="text-base font-semibold text-deep-blue dark:text-white">{value}</span>
      </div>
    </div>
  )
}

EventInfoCard.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  className: PropTypes.string
}

export default EventInfoCard
