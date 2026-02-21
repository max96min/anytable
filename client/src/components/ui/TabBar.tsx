import React, { useRef, useEffect } from 'react';

export interface Tab {
  key: string;
  label: string;
}

export interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (key: string) => void;
  className?: string;
}

const TabBar: React.FC<TabBarProps> = ({ tabs, activeTab, onChange, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Scroll active tab into view when it changes
  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      const container = containerRef.current;
      const active = activeRef.current;
      const scrollLeft =
        active.offsetLeft - container.offsetWidth / 2 + active.offsetWidth / 2;
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, [activeTab]);

  return (
    <div
      ref={containerRef}
      className={`flex overflow-x-auto no-scrollbar border-b border-gray-200 ${className}`.trim()}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <button
            key={tab.key}
            ref={isActive ? activeRef : undefined}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={`relative shrink-0 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
              isActive ? 'text-primary-500' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {/* Orange underline indicator */}
            {isActive && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary-500" />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default TabBar;
