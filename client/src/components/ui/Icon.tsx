import React from 'react';

export interface IconProps {
  /** Material Symbols Outlined icon name (e.g. "restaurant_menu") */
  name: string;
  /** Size in pixels. Defaults to 24. */
  size?: number;
  /** Whether to render the filled variant. */
  filled?: boolean;
  className?: string;
}

const Icon = React.forwardRef<HTMLSpanElement, IconProps>(
  ({ name, size = 24, filled = false, className = '' }, ref) => {
    return (
      <span
        ref={ref}
        className={`material-symbols-outlined${filled ? ' filled' : ''} select-none ${className}`.trim()}
        style={{ fontSize: size }}
        aria-hidden="true"
      >
        {name}
      </span>
    );
  },
);

Icon.displayName = 'Icon';

export default Icon;
