import React from 'react';
import Icon from './Icon';
import Spinner from './Spinner';

export type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Material Symbols icon name shown before the label. */
  icon?: string;
  /** Show a loading spinner and disable the button. */
  loading?: boolean;
  /** Stretch to full width. */
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 focus-visible:ring-primary-300',
  outline:
    'border-2 border-primary-500 text-primary-500 hover:bg-primary-50 active:bg-primary-100 focus-visible:ring-primary-300',
  ghost:
    'text-gray-700 hover:bg-gray-100 active:bg-gray-200 focus-visible:ring-gray-300',
  danger:
    'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 focus-visible:ring-red-300',
};

const sizeClasses: Record<ButtonSize, { button: string; icon: number; spinner: 'sm' | 'md' }> = {
  sm: { button: 'px-3 py-1.5 text-sm rounded-lg gap-1.5', icon: 18, spinner: 'sm' },
  md: { button: 'px-5 py-2.5 text-sm rounded-xl gap-2', icon: 20, spinner: 'sm' },
  lg: { button: 'px-6 py-3 text-base rounded-xl gap-2', icon: 22, spinner: 'md' },
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      icon,
      loading = false,
      fullWidth = false,
      disabled,
      className = '',
      children,
      ...rest
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;
    const sc = sizeClasses[size];

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`inline-flex items-center justify-center font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sc.button} ${fullWidth ? 'w-full' : ''} ${className}`.trim()}
        {...rest}
      >
        {loading ? (
          <Spinner size={sc.spinner} className={variant === 'ghost' ? 'border-gray-500 border-t-transparent' : 'border-current border-t-transparent'} />
        ) : icon ? (
          <Icon name={icon} size={sc.icon} />
        ) : null}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';

export default Button;
