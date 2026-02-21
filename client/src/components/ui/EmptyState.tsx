import React from 'react';
import Icon from './Icon';

export interface EmptyStateProps {
  /** Material Symbols icon name. */
  icon: string;
  /** Primary heading. */
  title: string;
  /** Secondary description text. */
  description?: string;
  /** Optional action element (e.g. a Button). */
  action?: React.ReactNode;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-12 px-6 ${className}`.trim()}>
      <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-gray-100 mb-4">
        <Icon name={icon} size={32} className="text-gray-400" />
      </div>
      <h3 className="text-base font-semibold text-surface-dark mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 max-w-xs mb-4">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
};

export default EmptyState;
