import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SponsoredBadgeProps {
  className?: string;
}

export const SponsoredBadge = ({ className }: SponsoredBadgeProps) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground backdrop-blur-sm',
      className
    )}
    aria-label="Evento patrocinado"
  >
    <Sparkles className="h-3 w-3" aria-hidden="true" />
    Patrocinado
  </span>
);
