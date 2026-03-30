import React, { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Trophy, Star } from 'lucide-react';
import { MarketService } from '../../lib/MarketService';
import { cn } from '../../lib/utils';

interface DailyMissionWidgetProps {
  userId: string;
}

export default function DailyMissionWidget({ userId }: DailyMissionWidgetProps) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setError(null);
        const data = await MarketService.getDailyMissions(userId);
        setStats(data);
      } catch (err: any) {
        console.error('Error fetching missions:', err);
        try {
          const parsed = JSON.parse(err.message);
          setError(parsed.error);
        } catch {
          setError(err.message || 'Failed to fetch missions');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [userId]);

  if (loading) return (
    <div className="bg-surface-container rounded-3xl p-6 animate-pulse h-40">
      <div className="h-4 w-24 bg-surface-container-highest rounded mb-4"></div>
      <div className="space-y-3">
        <div className="h-3 w-full bg-surface-container-highest rounded"></div>
        <div className="h-3 w-full bg-surface-container-highest rounded"></div>
      </div>
    </div>
  );

  if (error) return (
    <div className="bg-surface-container rounded-3xl p-6 border border-error/20 text-center">
      <p className="text-error text-xs font-bold uppercase tracking-widest mb-2">Mission Error</p>
      <p className="text-on-surface-variant text-[10px] mb-4">{error}</p>
      <button 
        onClick={() => window.location.reload()}
        className="text-[10px] font-black uppercase tracking-widest text-primary underline"
      >
        Retry
      </button>
    </div>
  );

  const missions = [
    {
      id: 'add_prices',
      title: 'Add 2 Prices',
      current: stats?.pricesAdded || 0,
      target: 2,
      reward: 20,
    },
    {
      id: 'confirm_prices',
      title: 'Confirm 3 Prices',
      current: stats?.pricesConfirmed || 0,
      target: 3,
      reward: 15,
    }
  ];

  const allCompleted = missions.every(m => m.current >= m.target);

  return (
    <div className={cn(
      "bg-surface-container rounded-3xl p-6 border transition-all duration-500",
      allCompleted ? "border-primary/30 bg-primary/5" : "border-transparent"
    )}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Trophy size={20} className={allCompleted ? "text-primary" : "text-on-surface-variant"} />
          <h3 className="font-headline font-black text-on-surface uppercase tracking-tight">Daily Missions</h3>
        </div>
        {allCompleted && (
          <div className="flex items-center gap-1 bg-primary text-on-primary px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest animate-bounce">
            <Star size={10} fill="currentColor" />
            <span>Bonus Ready</span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {missions.map((mission) => {
          const progress = Math.min((mission.current / mission.target) * 100, 100);
          const isDone = mission.current >= mission.target;

          return (
            <div key={mission.id} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 font-medium text-on-surface">
                  {isDone ? (
                    <CheckCircle2 size={16} className="text-primary" />
                  ) : (
                    <Circle size={16} className="text-outline" />
                  )}
                  <span>{mission.title}</span>
                </div>
                <span className="text-xs font-mono text-on-surface-variant">
                  {mission.current}/{mission.target}
                </span>
              </div>
              <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-1000 ease-out",
                    isDone ? "bg-primary" : "bg-on-surface-variant/30"
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {!allCompleted && (
        <p className="mt-6 text-[10px] text-on-surface-variant uppercase tracking-widest font-bold text-center">
          Complete all to earn bonus points
        </p>
      )}
    </div>
  );
}
