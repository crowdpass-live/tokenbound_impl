import PropTypes from 'prop-types'
import { cn } from '../../lib/utils'

const ScheduleItem = ({ time, title, speaker, description, isActive = false, className }) => {
  return (
    <div className={cn(
      "flex gap-4 p-4 rounded-xl transition-all",
      isActive 
        ? "bg-primary/10 border-l-4 border-primary" 
        : "bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700",
      className
    )}>
      <div className="flex-shrink-0 w-20 text-center">
        <span className={cn(
          "text-sm font-bold",
          isActive ? "text-primary" : "text-deep-blue dark:text-white"
        )}>
          {time}
        </span>
      </div>
      <div className="flex-grow border-l-2 border-gray-200 dark:border-zinc-600 pl-4">
        <h4 className="font-semibold text-deep-blue dark:text-white">{title}</h4>
        {speaker && (
          <p className="text-sm text-primary font-medium mt-1">{speaker}</p>
        )}
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{description}</p>
        )}
      </div>
    </div>
  )
}

ScheduleItem.propTypes = {
  time: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  speaker: PropTypes.string,
  description: PropTypes.string,
  isActive: PropTypes.bool,
  className: PropTypes.string
}

export default ScheduleItem
