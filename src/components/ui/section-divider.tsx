import { cn } from "@/lib/utils";

interface SectionDividerProps {
  label: string;
  className?: string;
}

export const SectionDivider = ({ label, className }: SectionDividerProps) => {
  return (
    <div className={cn("flex items-center gap-3 px-5", className)}>
      <div className="flex-1 h-px bg-border/40" aria-hidden="true" />
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <div className="flex-1 h-px bg-border/40" aria-hidden="true" />
    </div>
  );
};
