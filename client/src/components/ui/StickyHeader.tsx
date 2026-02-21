import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon';

export interface StickyHeaderProps {
  /** Title text shown in the center. */
  title?: string;
  /** Show a back arrow that calls navigate(-1). Defaults to false. */
  showBack?: boolean;
  /** Custom back handler. If not provided, defaults to router back navigation. */
  onBack?: () => void;
  /** Elements rendered on the right side. */
  rightActions?: React.ReactNode;
  className?: string;
}

const StickyHeader: React.FC<StickyHeaderProps> = ({
  title,
  showBack = false,
  onBack,
  rightActions,
  className = '',
}) => {
  const navigate = useNavigate();
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setHasScrolled(window.scrollY > 4);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <header
      className={`sticky top-0 z-40 bg-white transition-shadow duration-200 ${hasScrolled ? 'shadow-sm' : ''} ${className}`.trim()}
    >
      <div className="flex items-center h-14 px-4">
        {/* Left: back button */}
        <div className="w-10 flex justify-start">
          {showBack && (
            <button
              onClick={handleBack}
              className="p-1 -ml-1 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Go back"
            >
              <Icon name="arrow_back" size={22} />
            </button>
          )}
        </div>

        {/* Center: title */}
        <div className="flex-1 text-center">
          {title && (
            <h1 className="text-base font-semibold text-surface-dark truncate">{title}</h1>
          )}
        </div>

        {/* Right: actions */}
        <div className="w-10 flex justify-end">{rightActions}</div>
      </div>
    </header>
  );
};

export default StickyHeader;
