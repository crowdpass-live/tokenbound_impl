import { Loader2, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { cn } from '../../lib/utils';

const statusConfig = {
  idle: {
    icon: null,
    label: '',
    color: '',
  },
  pending: {
    icon: Loader2,
    label: 'Transaction pending...',
    color: 'text-amber-600 bg-amber-50 border-amber-200',
  },
  confirming: {
    icon: Loader2,
    label: 'Confirming on chain...',
    color: 'text-blue-600 bg-blue-50 border-blue-200',
  },
  success: {
    icon: CheckCircle2,
    label: 'Transaction confirmed!',
    color: 'text-active-green bg-green-50 border-green-200',
  },
  error: {
    icon: XCircle,
    label: 'Transaction failed',
    color: 'text-red-600 bg-red-50 border-red-200',
  },
};

const TransactionStatus = ({ status = 'idle', message, txHash, className }) => {
  if (status === 'idle') return null;

  const config = statusConfig[status];
  const Icon = config.icon;
  const isAnimated = status === 'pending' || status === 'confirming';

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-all duration-300',
        config.color,
        className
      )}
      role="alert"
      aria-live="polite"
    >
      {Icon && (
        <Icon className={cn('w-5 h-5 shrink-0', isAnimated && 'animate-spin')} aria-hidden="true" />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium">{message || config.label}</p>
        {status === 'pending' && (
          <div className="mt-2 w-full bg-amber-200 rounded-full h-1.5 overflow-hidden">
            <div className="bg-amber-500 h-1.5 rounded-full animate-progress" />
          </div>
        )}
      </div>
      {txHash && (
        <a
          href={`https://sepolia.voyager.online/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 hover:opacity-80 transition-opacity"
          aria-label="View transaction on explorer"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      )}
    </div>
  );
};

export { TransactionStatus };
