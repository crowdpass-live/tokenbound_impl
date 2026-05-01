import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

const spinnerSizes = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

const LoadingSpinner = ({ size = 'md', className, label = 'Loading...' }) => {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)} role="status">
      <Loader2
        className={cn('animate-spin text-deep-blue', spinnerSizes[size])}
        aria-hidden="true"
      />
      {label && <span className="text-sm text-gray-text">{label}</span>}
      <span className="sr-only">{label}</span>
    </div>
  );
};

export { LoadingSpinner };
