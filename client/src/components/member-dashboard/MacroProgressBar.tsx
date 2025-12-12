interface MacroProgressBarProps {
  label: string;
  current: number;
  target: number;
  color?: 'orange' | 'blue' | 'green';
}

export function MacroProgressBar({ label, current, target, color = 'orange' }: MacroProgressBarProps) {
  const percentage = Math.min((current / target) * 100, 100);
  
  const colorClasses = {
    orange: 'from-orange-500 to-amber-400',
    blue: 'from-blue-500 to-cyan-400',
    green: 'from-green-500 to-emerald-400',
  };

  return (
    <div className="flex-1">
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      <p className="text-orange-700 font-bold text-sm mb-2">
        {current}g / {target}g
      </p>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full bg-gradient-to-r ${colorClasses[color]} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
