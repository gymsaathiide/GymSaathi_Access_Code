import { cn } from "@/lib/utils";

interface CircularProgressProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  children?: React.ReactNode;
  color?: string;
  trackColor?: string;
}

export function CircularProgress({
  value,
  max,
  size = 120,
  strokeWidth = 10,
  className,
  children,
  color = "stroke-primary",
  trackColor = "stroke-muted/30"
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / max, 1);
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={trackColor}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={cn(color, "transition-all duration-500 ease-out")}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}

interface MacroCircleProps {
  label: string;
  value: number;
  target: number;
  unit?: string;
  color: string;
  size?: number;
}

export function MacroCircle({ label, value, target, unit = "g", color, size = 60 }: MacroCircleProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <CircularProgress
        value={value}
        max={target}
        size={size}
        strokeWidth={6}
        color={color}
        trackColor="stroke-muted/20"
      >
        <span className="text-xs font-bold">{value}</span>
      </CircularProgress>
      <div className="text-center">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs text-muted-foreground/60 ml-0.5">/{target}{unit}</span>
      </div>
    </div>
  );
}
