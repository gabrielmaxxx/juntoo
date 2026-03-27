import { Shield, MapPin, Users, Lock } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface SafetyModalProps {
  open: boolean;
  onAccept: () => void;
  onCancel: () => void;
}

export const SafetyModal = ({ open, onAccept, onCancel }: SafetyModalProps) => {
  const tips = [
    { icon: MapPin, text: 'Prefira locais públicos e movimentados para encontros presenciais.' },
    { icon: Users, text: 'Avise alguém de confiança sobre onde e com quem você estará.' },
    { icon: Lock, text: 'Não compartilhe dados pessoais sensíveis (endereço, documentos, dados bancários).' },
    { icon: Shield, text: 'Confie nos seus instintos — se algo parecer errado, saia da situação.' },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Shield className="h-5 w-5" />
            Dicas de Segurança
          </DialogTitle>
          <DialogDescription>
            Antes de confirmar sua presença, leia as dicas abaixo para sua segurança.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {tips.map((tip, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <tip.icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-foreground">{tip.text}</p>
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={onAccept} className="w-full">
            Li e concordo
          </Button>
          <Button variant="outline" onClick={onCancel} className="w-full">
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
