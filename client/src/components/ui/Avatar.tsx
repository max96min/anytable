import React from 'react';

export type AvatarSize = 'sm' | 'md' | 'lg';

export interface AvatarProps {
  /** Full name to derive initials from. */
  name: string;
  /** Background color (any valid CSS color). Falls back to primary-500. */
  color?: string;
  /** Size variant. Defaults to 'md'. */
  size?: AvatarSize;
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-12 w-12 text-sm',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

const Avatar: React.FC<AvatarProps> = ({
  name,
  color,
  size = 'md',
  className = '',
}) => {
  return (
    <div
      className={`inline-flex items-center justify-center rounded-full font-semibold text-white shrink-0 ${sizeClasses[size]} ${className}`.trim()}
      style={{ backgroundColor: color ?? '#e68119' }}
      title={name}
      aria-label={name}
    >
      {getInitials(name)}
    </div>
  );
};

export default Avatar;
