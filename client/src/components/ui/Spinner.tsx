import React from 'react';

export interface SpinnerProps {
  /** Size variant of the spinner. */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes. */
  className?: string;
}

const sizeClasses: Record<NonNullable<SpinnerProps['size']>, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-[3px]',
};

const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block rounded-full border-primary-500 border-t-transparent animate-spin ${sizeClasses[size]} ${className}`.trim()}
    />
  );
};

export default Spinner;
