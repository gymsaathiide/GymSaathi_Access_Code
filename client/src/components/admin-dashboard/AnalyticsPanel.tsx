import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface AnalyticsData {
  month: string;
  value: number;
}

interface AnalyticsPanelProps {
  data: AnalyticsData[];
  title?: string;
  label?: string;
}

export function AnalyticsPanel({ data, title = 'Analytics', label = 'New Members' }: AnalyticsPanelProps) {
  return (
    <div className="analytics-panel">
      <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
            />
            <Tooltip
              contentStyle={{
                background: '#1f2937',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
              }}
              formatter={(value: number) => [value, label]}
            />
            <Bar
              dataKey="value"
              fill="#22c55e"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-2 mt-4">
        <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
        <span className="text-sm text-gray-600">{label}</span>
      </div>
    </div>
  );
}
