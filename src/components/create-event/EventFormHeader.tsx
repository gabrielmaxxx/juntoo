import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EventFormHeaderProps {
  onBack: () => void;
}

export const EventFormHeader = ({ onBack }: EventFormHeaderProps) => {
  return (
    <div className="bg-primary text-primary-foreground p-4">
      <div className="max-w-md mx-auto flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onBack} 
          className="text-primary-foreground hover:bg-primary-foreground/20"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-6 h-6" aria-hidden="true" />
        </Button>
        <h1 className="text-xl font-bold">Criar Evento</h1>
      </div>
    </div>
  );
};
