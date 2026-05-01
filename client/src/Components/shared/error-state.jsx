import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './button';
import { cn } from '../../lib/utils';

const ErrorState = ({ title = 'Something went wrong', message, onRetry, className }) => {
  return (
    <div
      className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}
      role="alert"
    >
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-red-500" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-deep-blue mb-2">{title}</h3>
      {message && <p className="text-sm text-gray-text max-w-sm mb-6">{message}</p>}
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          className="text-deep-blue border-deep-blue hover:bg-deep-blue hover:text-white gap-2"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          Try Again
        </Button>
      )}
    </div>
  );
};

export { ErrorState };
