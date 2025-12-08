import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";

interface WeekDatePickerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  maxDays?: number;
}

export function WeekDatePicker({ selectedDate, onDateChange, maxDays = 7 }: WeekDatePickerProps) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(selectedDate, { weekStartsOn: 0 }));
  
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();
  
  const goToPrevWeek = () => {
    setWeekStart(addDays(weekStart, -7));
  };
  
  const goToNextWeek = () => {
    setWeekStart(addDays(weekStart, 7));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPrevWeek}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">{format(weekStart, "MMMM yyyy")}</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToNextWeek}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex justify-between gap-1">
        {weekDays.map((day, index) => {
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);
          const dayNum = index + 1;
          const isDisabled = dayNum > maxDays;
          
          return (
            <button
              key={day.toISOString()}
              onClick={() => !isDisabled && onDateChange(day)}
              disabled={isDisabled}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-xl min-w-[40px] transition-all",
                isSelected && "bg-primary text-primary-foreground shadow-lg",
                !isSelected && !isDisabled && "hover:bg-muted/50",
                isToday && !isSelected && "ring-1 ring-primary/50",
                isDisabled && "opacity-40 cursor-not-allowed"
              )}
            >
              <span className={cn(
                "text-[10px] uppercase font-medium",
                isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
              )}>
                {format(day, "EEE")}
              </span>
              <span className={cn(
                "text-lg font-bold",
                isSelected ? "text-primary-foreground" : "text-foreground"
              )}>
                {format(day, "d")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
