import React from 'react';
import { VIPLevel, VIP_CONFIG } from '../lib/vip';
import clsx from 'clsx';
import { Star, Crown, Gem, Flame } from 'lucide-react';

interface PlayerAvatarProps {
  photoURL?: string;
  displayName?: string;
  vipLevel?: VIPLevel;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  shape?: 'circle' | 'square';
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-xl',
  xl: 'w-24 h-24 text-3xl',
  '2xl': 'w-32 h-32 text-4xl',
  '3xl': 'w-48 h-48 text-5xl',
  '4xl': 'w-64 h-64 text-6xl',
};

const VIPBadge = ({ level, size, shape }: { level: NonNullable<VIPLevel>, size: PlayerAvatarProps['size'], shape: PlayerAvatarProps['shape'] }) => {
  const config = VIP_CONFIG[level];
  if (!config) return null;

  const isSmall = size === 'sm' || size === 'md';

  return (
    <div className={clsx(
      "absolute left-1/2 -translate-x-1/2 flex items-center justify-center rounded-full font-black tracking-widest border border-black/50 shadow-lg z-20",
      `bg-gradient-to-r ${config.gradient} text-black`,
      isSmall ? "px-1.5 py-0.5 text-[8px]" : "px-3 py-0.5 text-[10px]",
      shape === 'circle' ? "-bottom-2" : "bottom-1"
    )}>
      VIP
    </div>
  );
};

export default function PlayerAvatar({ photoURL, displayName, vipLevel, className, size = 'md', shape = 'circle' }: PlayerAvatarProps) {
  const config = vipLevel ? VIP_CONFIG[vipLevel] : null;
  const isDemon = vipLevel === 'demon';

  return (
    <div className={clsx(
      "relative inline-block", 
      shape === 'circle' ? "rounded-full" : "rounded-2xl w-full h-full", 
      className
    )}>
      <div className={clsx(
        "relative flex items-center justify-center overflow-hidden bg-zinc-800",
        shape === 'circle' ? [sizeClasses[size], "rounded-full"] : "rounded-2xl w-full h-full min-h-[inherit]",
        config ? `border ${config.borderColor} shadow-lg ${config.shadow}` : 'border border-zinc-700',
        isDemon && "animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.6)]"
      )}>
        {photoURL ? (
          <img src={photoURL} alt={displayName || ''} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span className={clsx("font-bold text-zinc-400", shape === 'circle' ? "" : "text-6xl")}>
            {displayName?.charAt(0)?.toUpperCase()}
          </span>
        )}
      </div>
      {vipLevel && <VIPBadge level={vipLevel} size={size} shape={shape} />}
    </div>
  );
}
