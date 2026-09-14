import React from 'react';
import { getAvatarById } from '../constants/avatars';

interface AvatarIconProps {
  avatarId: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBadge?: boolean;
  badgeText?: string;
  badgeColor?: string;
}

export const AvatarIcon: React.FC<AvatarIconProps> = ({
  avatarId,
  size = 'md',
  className = '',
  showBadge = false,
  badgeText,
  badgeColor = 'bg-rose-600',
}) => {
  const avatar = getAvatarById(avatarId);

  const sizeMap = {
    sm: 'w-8 h-8 p-1.5',
    md: 'w-12 h-12 p-2.5',
    lg: 'w-16 h-16 p-3.5',
    xl: 'w-24 h-24 p-5',
  };

  const svgSize = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-9 h-9',
    xl: 'w-14 h-14',
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        className={`${sizeMap[size]} rounded-2xl bg-gradient-to-br ${avatar.bgColor} shadow-md ring-1 ring-white/10 flex items-center justify-center transition-transform`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className={`${svgSize[size]} text-slate-100 drop-shadow`}
        >
          <path d={avatar.svgPath} />
        </svg>
      </div>
      {showBadge && badgeText && (
        <span
          className={`absolute -bottom-1 -right-1 px-1.5 py-0.5 text-[10px] font-bold rounded-md ${badgeColor} text-white shadow-sm ring-1 ring-slate-950 whitespace-nowrap`}
        >
          {badgeText}
        </span>
      )}
    </div>
  );
};
