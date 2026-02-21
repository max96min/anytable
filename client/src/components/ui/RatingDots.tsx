import React from 'react';

export interface RatingDotsProps {
  /** Current filled level (1-based). */
  level: number;
  /** Maximum number of dots. Defaults to 5. */
  maxLevel?: number;
  /** Dot color (CSS color string). Defaults to primary orange. */
  color?: string;
  /** When set, renders this emoji instead of colored dots. */
  emoji?: string;
  className?: string;
}

const RatingDots: React.FC<RatingDotsProps> = ({
  level,
  maxLevel = 5,
  color = '#e68119',
  emoji,
  className = '',
}) => {
  if (emoji) {
    return (
      <div className={`inline-flex items-center gap-0.5 ${className}`.trim()} aria-label={`${level} of ${maxLevel}`}>
        {Array.from({ length: level }, (_, i) => (
          <span key={i} className="text-sm leading-none">{emoji}</span>
        ))}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1 ${className}`.trim()} aria-label={`${level} of ${maxLevel}`}>
      {Array.from({ length: maxLevel }, (_, i) => (
        <span
          key={i}
          className="block h-2 w-2 rounded-full"
          style={{
            backgroundColor: i < level ? color : '#d1d5db',
          }}
        />
      ))}
    </div>
  );
};

export default RatingDots;
