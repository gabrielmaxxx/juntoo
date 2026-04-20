import { Shield, MapPin, Users, Lock } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';

interface SafetyModalProps {
  open: boolean;
  onAccept: () => void;
  onCancel: () => void;
}

export const SafetyModal = ({ open, onAccept, onCancel }: SafetyModalProps) => {
  const [acknowledged, setAcknowledged] = useState(false);
  const tips = [
    { icon: MapPin, text: 'Escolha locais públicos e movimentados para encontros presenciais.' },
    { icon: Users, text: 'Avise alguém de confiança sobre onde e com quem você estará.' },
    { icon: Shield, text: 'Confira o perfil do organizador antes de confirmar presença.' },
    { icon: Lock, text: 'Não compartilhe endereço, documentos ou dados bancários.' },
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

        <label className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm font-medium text-foreground">
          <Checkbox checked={acknowledged} onCheckedChange={(checked) => setAcknowledged(checked === true)} />
          Entendi
        </label>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={onAccept} className="w-full" disabled={!acknowledged}>
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
