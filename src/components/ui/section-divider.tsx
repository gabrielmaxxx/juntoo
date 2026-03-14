import { cn } from "@/lib/utils";

interface SectionDividerProps {
  label: string;
  className?: string;
}

export const SectionDivider = ({ label, className }: SectionDividerProps) => {
  return (
    <div className={cn("flex items-center gap-4 px-5", className)}>
      <div className="flex-1 h-px bg-border/30" aria-hidden="true" />
      <span className="text-[11px] font-medium text-muted-foreground/60 tracking-wide">
        {label}
      </span>
      <div className="flex-1 h-px bg-border/30" aria-hidden="true" />
    </div>
  );
};
