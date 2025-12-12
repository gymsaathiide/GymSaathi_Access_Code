import { cn } from '@/lib/utils';

interface DayPickerProps {
  days: { dayNumber: number; dayOfWeek: string; date: number }[];
  activeDay: number;
  onDaySelect: (day: number) => void;
}

export function DayPicker({ days, activeDay, onDaySelect }: DayPickerProps) {
  return (
    <div className="day-picker">
      {days.map((day) => (
        <button
          key={day.dayNumber}
          onClick={() => onDaySelect(day.dayNumber)}
          className={cn('day-chip', activeDay === day.dayNumber && 'active')}
        >
          <span className="text-[10px] font-medium opacity-80">{day.dayOfWeek}</span>
          <span className="text-sm font-bold">{day.date}</span>
        </button>
      ))}
    </div>
  );
}
