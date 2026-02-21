import React from 'react';
import Icon from './Icon';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Label shown above the input. */
  label?: string;
  /** Error message shown below the input. */
  error?: string;
  /** Material Symbols icon name rendered as a prefix. */
  icon?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', id, ...rest }, ref) => {
    const inputId = id ?? (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <Icon name={icon} size={20} />
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full px-4 py-3 rounded-xl border bg-white text-sm placeholder:text-gray-400 transition-all duration-150 focus:outline-none focus:ring-2 focus:border-transparent ${icon ? 'pl-10' : ''} ${error ? 'border-red-400 focus:ring-red-300' : 'border-gray-200 focus:ring-primary-500'} ${className}`.trim()}
            aria-invalid={error ? true : undefined}
            aria-describedby={error && inputId ? `${inputId}-error` : undefined}
            {...rest}
          />
        </div>
        {error && (
          <p id={inputId ? `${inputId}-error` : undefined} className="text-xs text-red-500 flex items-center gap-1">
            <Icon name="error" size={14} />
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export default Input;
