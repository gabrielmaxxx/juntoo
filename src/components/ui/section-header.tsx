import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  className?: string;
}

export const SectionHeader = ({ title, subtitle, icon, className }: SectionHeaderProps) => {
  return (
    <div className={cn("space-y-1", className)}>
      <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
        {title}
        {icon}
      </h2>
      {subtitle && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
};
