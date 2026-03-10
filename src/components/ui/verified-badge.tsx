import { CheckCircle, Building2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface VerifiedBadgeProps {
  verified?: boolean;
  businessVerified?: boolean;
  size?: 'sm' | 'md';
}

export const VerifiedBadge = ({ verified, businessVerified, size = 'md' }: VerifiedBadgeProps) => {
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  if (!verified && !businessVerified) return null;

  return (
    <TooltipProvider>
      {verified && (
        <Tooltip>
          <TooltipTrigger asChild>
            <CheckCircle className={`${iconSize} text-blue-500 shrink-0 inline-block`} />
          </TooltipTrigger>
          <TooltipContent><p>Usuário verificado</p></TooltipContent>
        </Tooltip>
      )}
      {businessVerified && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Building2 className={`${iconSize} text-emerald-500 shrink-0 inline-block`} />
          </TooltipTrigger>
          <TooltipContent><p>Empresa verificada</p></TooltipContent>
        </Tooltip>
      )}
    </TooltipProvider>
  );
};
