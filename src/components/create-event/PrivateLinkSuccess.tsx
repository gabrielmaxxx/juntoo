import { Lock, Copy, Share2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface PrivateLinkSuccessProps {
  privateLink: string;
  onBack: () => void;
}

export const PrivateLinkSuccess = ({ privateLink, onBack }: PrivateLinkSuccessProps) => {
  const { toast } = useToast();

  const copyPrivateLink = () => {
    navigator.clipboard.writeText(privateLink);
    toast({
      title: "Link copiado!",
      description: "O link do evento privado foi copiado para a área de transferência.",
    });
  };

  const sharePrivateLink = () => {
    const encodedLink = encodeURIComponent(privateLink);
    window.open(`https://wa.me/?text=${encodedLink}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-center">
              <Lock className="w-5 h-5 text-primary" />
              Evento Privado Criado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Seu evento privado foi criado com sucesso! Compartilhe este link único para convidar participantes:
            </p>
            
            <div className="p-3 bg-muted rounded-lg break-all text-sm">
              {privateLink}
            </div>
            
            <div className="flex gap-2">
              <Button onClick={copyPrivateLink} className="flex-1">
                <Copy className="w-4 h-4 mr-2" />
                Copiar Link
              </Button>
              <Button variant="outline" onClick={sharePrivateLink}>
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
            
            <Button onClick={onBack} variant="outline" className="w-full">
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
