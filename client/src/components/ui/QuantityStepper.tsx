import React from 'react';
import Icon from './Icon';

export interface QuantityStepperProps {
  /** Current value. */
  value: number;
  /** Called with the new value. */
  onChange: (value: number) => void;
  /** Minimum allowed value. Defaults to 0. */
  min?: number;
  /** Maximum allowed value. */
  max?: number;
  className?: string;
}

const QuantityStepper: React.FC<QuantityStepperProps> = ({
  value,
  onChange,
  min = 0,
  max,
  className = '',
}) => {
  const canDecrement = value > min;
  const canIncrement = max === undefined || value < max;

  return (
    <div className={`inline-flex items-center gap-2 ${className}`.trim()}>
      {/* Minus button */}
      <button
        type="button"
        disabled={!canDecrement}
        onClick={() => onChange(value - 1)}
        className="flex items-center justify-center h-8 w-8 rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 active:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Decrease quantity"
      >
        <Icon name="remove" size={18} />
      </button>

      {/* Quantity display */}
      <span className="min-w-[28px] text-center text-sm font-semibold text-surface-dark tabular-nums">
        {value}
      </span>

      {/* Plus button - orange, matches the design */}
      <button
        type="button"
        disabled={!canIncrement}
        onClick={() => onChange(value + 1)}
        className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary-500 text-white transition-colors hover:bg-primary-600 active:bg-primary-700 disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Increase quantity"
      >
        <Icon name="add" size={18} />
      </button>
    </div>
  );
};

export default QuantityStepper;
