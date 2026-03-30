import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';

interface TrendBadgeProps {
  trend: 'Rising' | 'Dropping' | 'Stable';
  className?: string;
}

export default function TrendBadge({ trend, className }: TrendBadgeProps) {
  const config = {
    Rising: {
      icon: TrendingUp,
      text: 'Rising',
      color: 'bg-red-100 text-red-700 border-red-200',
    },
    Dropping: {
      icon: TrendingDown,
      text: 'Dropping',
      color: 'bg-green-100 text-green-700 border-green-200',
    },
    Stable: {
      icon: Minus,
      text: 'Stable',
      color: 'bg-blue-100 text-blue-700 border-blue-200',
    },
  };

  const { icon: Icon, text, color } = config[trend];

  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold uppercase tracking-wider",
      color,
      className
    )}>
      <Icon size={14} />
      <span>{text}</span>
    </div>
  );
}
