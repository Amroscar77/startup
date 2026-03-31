import React, { useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { PriceHistory } from '../../lib/MarketService';

interface PriceHistoryChartProps {
  history: PriceHistory[];
  currency: string;
}

export default function PriceHistoryChart({ history, currency }: PriceHistoryChartProps) {
  const data = useMemo(() => {
    return history.map(h => ({
      date: new Date(h.timestamp.seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      price: h.price,
      fullDate: new Date(h.timestamp.seconds * 1000).toLocaleString(),
    }));
  }, [history]);

  if (history.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant text-on-surface-variant text-sm italic">
        No historical data yet
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1B5E20" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#1B5E20" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E0E0" />
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: '#757575' }}
            minTickGap={30}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: '#757575' }}
          />
          <Tooltip 
            contentStyle={{ 
              borderRadius: '12px', 
              border: 'none', 
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              fontSize: '12px'
            }}
            formatter={(value: number) => [`${currency} ${value.toFixed(2)}`, 'Price']}
          />
          <Area 
            type="monotone" 
            dataKey="price" 
            stroke="#1B5E20" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorPrice)" 
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
