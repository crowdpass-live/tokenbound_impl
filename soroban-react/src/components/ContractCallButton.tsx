import React, { useState } from 'react';

export interface ContractCallButtonProps {
  onClick: () => Promise<any>;
  label: string;
  loadingLabel?: string;
  className?: string;
  onSuccess?: (result: any) => void;
  onError?: (error: any) => void;
}

export const ContractCallButton: React.FC<ContractCallButtonProps> = ({
  onClick,
  label,
  loadingLabel = 'Processing...',
  className = '',
  onSuccess,
  onError,
}) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const result = await onClick();
      onSuccess?.(result);
    } catch (err) {
      console.error('Contract call failed:', err);
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 ${className}`}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {loadingLabel}
        </span>
      ) : (
        label
      )}
    </button>
  );
};
