import React from 'react';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps {
  /** Inner padding. Defaults to 'md'. */
  padding?: CardPadding;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  children?: React.ReactNode;
}

const paddingClasses: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ padding = 'md', className = '', onClick, children }, ref) => {
    return (
      <div
        ref={ref}
        className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${paddingClasses[padding]} ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform duration-100' : ''} ${className}`.trim()}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick(e as unknown as React.MouseEvent<HTMLDivElement>);
                }
              }
            : undefined
        }
      >
        {children}
      </div>
    );
  },
);

Card.displayName = 'Card';

export default Card;
