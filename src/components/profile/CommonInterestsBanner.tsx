/**
 * Banner que destaca interesses em comum entre o visitante autenticado
 * e o perfil que está sendo visualizado. Reduz a frieza do primeiro contato.
 */
import { Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface CommonInterestsBannerProps {
  myInterests?: string[] | null;
  theirInterests?: string[] | null;
  theirFirstName: string;
}

export const CommonInterestsBanner = ({
  myInterests,
  theirInterests,
  theirFirstName,
}: CommonInterestsBannerProps) => {
  if (!myInterests?.length || !theirInterests?.length) return null;

  const common = myInterests.filter((i) => theirInterests.includes(i));
  if (common.length === 0) return null;

  const firstTwo = common.slice(0, 2).join(' e ');
  const extra = common.length > 2 ? ` +${common.length - 2}` : '';

  return (
    <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/30">
      <CardContent className="p-4 flex items-start gap-3">
        <div className="shrink-0 w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            Vocês dois gostam de {firstTwo}
            {extra}! ⚡
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ótimo ponto para começar uma conversa com {theirFirstName}.
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {common.slice(0, 4).map((interest) => (
              <Badge key={interest} variant="secondary" className="text-xs">
                {interest}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
