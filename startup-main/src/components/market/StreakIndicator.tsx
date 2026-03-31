import React from 'react';
import { Flame, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StreakIndicatorProps {
  streak: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function StreakIndicator({ streak, className, size = 'md' }: StreakIndicatorProps) {
  const sizes = {
    sm: { icon: 14, text: 'text-xs', padding: 'px-2 py-0.5' },
    md: { icon: 18, text: 'text-sm', padding: 'px-3 py-1' },
    lg: { icon: 24, text: 'text-lg', padding: 'px-4 py-2' },
  };

  const { icon: iconSize, text: textSize, padding } = sizes[size];

  if (streak === 0) return null;

  return (
    <div className={cn(
      "flex items-center gap-1.5 rounded-full font-black uppercase tracking-widest transition-all duration-500",
      streak >= 7 ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20 animate-pulse" : "bg-orange-100 text-orange-600",
      padding,
      textSize,
      className
    )}>
      {streak >= 7 ? <Zap size={iconSize} fill="currentColor" /> : <Flame size={iconSize} fill="currentColor" />}
      <span>{streak} Day Streak</span>
    </div>
  );
}
