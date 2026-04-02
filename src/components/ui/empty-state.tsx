import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
  emoji?: string;
}

export const EmptyState = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
  emoji,
}: EmptyStateProps) => {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in", className)}>
      <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-5 relative">
        {icon}
        {emoji && (
          <span className="absolute -top-2 -right-2 text-2xl animate-bounce" aria-hidden="true">
            {emoji}
          </span>
        )}
      </div>
      <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-[280px] leading-relaxed mb-6">
        {description}
      </p>
      <div className="flex flex-col gap-2 w-full max-w-[200px]">
        {actionLabel && onAction && (
          <Button onClick={onAction} className="w-full">
            {actionLabel}
          </Button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <Button variant="ghost" size="sm" onClick={onSecondaryAction} className="w-full text-xs">
            {secondaryActionLabel}
          </Button>
        )}
      </div>
    </div>
  );
};
