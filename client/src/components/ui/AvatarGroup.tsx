import React from 'react';
import Avatar, { type AvatarSize } from './Avatar';

export interface Participant {
  name: string;
  color?: string;
}

export interface AvatarGroupProps {
  participants: Participant[];
  /** Maximum visible avatars before showing "+N". Defaults to 4. */
  max?: number;
  /** Avatar size. Defaults to 'md'. */
  size?: AvatarSize;
  className?: string;
}

const overlapClasses: Record<AvatarSize, string> = {
  sm: '-ml-2',
  md: '-ml-3',
  lg: '-ml-4',
};

const ringClasses: Record<AvatarSize, string> = {
  sm: 'ring-2 ring-white',
  md: 'ring-2 ring-white',
  lg: 'ring-[3px] ring-white',
};

const extraSizeClasses: Record<AvatarSize, string> = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-12 w-12 text-sm',
};

const AvatarGroup: React.FC<AvatarGroupProps> = ({
  participants,
  max = 4,
  size = 'md',
  className = '',
}) => {
  const visible = participants.slice(0, max);
  const remaining = participants.length - max;

  return (
    <div className={`flex items-center ${className}`.trim()}>
      {visible.map((p, i) => (
        <div
          key={`${p.name}-${i}`}
          className={`${i > 0 ? overlapClasses[size] : ''} ${ringClasses[size]} rounded-full`}
        >
          <Avatar name={p.name} color={p.color} size={size} />
        </div>
      ))}
      {remaining > 0 && (
        <div
          className={`${overlapClasses[size]} ${ringClasses[size]} rounded-full inline-flex items-center justify-center bg-gray-200 text-gray-600 font-semibold shrink-0 ${extraSizeClasses[size]}`}
          title={`+${remaining} more`}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
};

export default AvatarGroup;
