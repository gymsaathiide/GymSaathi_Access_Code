import { cn } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface MemberActivityChartProps {
  data: { name: string; value: number }[];
  title?: string;
  className?: string;
}

const COLORS = ['#f97316', '#22c55e', '#3b82f6', '#a855f7'];

export function MemberActivityChart({ data, title = "Member Activity", className }: MemberActivityChartProps) {
  return (
    <div className={cn(
      "bg-card-dark rounded-2xl p-4 md:p-6",
      className
    )}>
      <h3 className="text-white font-semibold mb-4">{title}</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis 
              dataKey="name" 
              stroke="rgba(255,255,255,0.3)" 
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              stroke="rgba(255,255,255,0.3)" 
              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(220 26% 16%)', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: 'white'
              }}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="#f97316" 
              strokeWidth={2}
              fill="url(#colorValue)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface MembershipPieChartProps {
  data: { name: string; value: number; color?: string }[];
  title?: string;
  total?: number;
  centerLabel?: string;
  className?: string;
}

export function MembershipPieChart({ 
  data, 
  title = "Membership Distribution", 
  total,
  centerLabel,
  className 
}: MembershipPieChartProps) {
  const chartData = data.map((item, index) => ({
    ...item,
    color: item.color || COLORS[index % COLORS.length]
  }));

  return (
    <div className={cn(
      "bg-card-dark rounded-2xl p-4 md:p-6",
      className
    )}>
      <h3 className="text-white font-semibold mb-4">{title}</h3>
      <div className="flex items-center gap-4">
        <div className="h-32 w-32 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={50}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {(total !== undefined || centerLabel) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold text-white">{total ?? ''}</span>
              <span className="text-xs text-white/50">{centerLabel}</span>
            </div>
          )}
        </div>
        <div className="flex-1 space-y-2">
          {chartData.map((item, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-white/70 flex-1">{item.name}</span>
              <span className="text-white font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface TargetGaugeProps {
  percentage: number;
  target: number;
  current: number;
  title?: string;
  className?: string;
}

export function TargetGauge({ 
  percentage, 
  target, 
  current, 
  title = "Membership Target",
  className 
}: TargetGaugeProps) {
  const clampedPercentage = Math.min(100, Math.max(0, percentage));
  const isAboveTarget = percentage >= 100;
  
  return (
    <div className={cn(
      "bg-card-dark rounded-2xl p-4 md:p-6",
      className
    )}>
      <h3 className="text-white font-semibold mb-4">{title}</h3>
      <div className="flex flex-col items-center">
        <div className="relative w-32 h-16 overflow-hidden">
          <div 
            className="absolute inset-0 rounded-t-full border-8 border-b-0"
            style={{ 
              borderColor: 'rgba(255,255,255,0.1)',
            }}
          />
          <div 
            className="absolute inset-0 rounded-t-full border-8 border-b-0"
            style={{ 
              borderColor: isAboveTarget ? '#22c55e' : '#f97316',
              clipPath: `polygon(0 100%, 0 0, ${clampedPercentage}% 0, ${clampedPercentage}% 100%)`,
              transition: 'clip-path 0.5s ease-out'
            }}
          />
        </div>
        <div className="mt-2 text-center">
          <span className="text-2xl font-bold text-white">{percentage.toFixed(1)}%</span>
          {isAboveTarget && (
            <span className="text-green-400 text-xs ml-2">+{(percentage - 100).toFixed(0)}%</span>
          )}
        </div>
        <p className="text-white/50 text-xs mt-1">
          {isAboveTarget ? "It's higher than yesterday" : "Keep pushing!"}
        </p>
        <div className="flex justify-between w-full mt-4 text-sm">
          <div className="text-center">
            <p className="text-white/50">Target</p>
            <p className="text-red-400 font-semibold">{target} ↓</p>
          </div>
          <div className="text-center">
            <p className="text-white/50">Today</p>
            <p className="text-green-400 font-semibold">{current} ↑</p>
          </div>
        </div>
      </div>
    </div>
  );
}
