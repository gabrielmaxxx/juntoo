import { memo, useRef, useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useTitleSuggestions } from '@/hooks/useTitleSuggestions';

const CATEGORY_PLACEHOLDERS: Record<string, string> = {
  'Esportes': 'Ex: Futebol society no parque',
  'Música': 'Ex: Roda de samba no bar do centro',
  'Arte': 'Ex: Ateliê de pintura ao ar livre',
  'Tecnologia': 'Ex: Meetup de devs no coworking',
  'Culinária': 'Ex: Churrasquinho de domingo',
  'Viagem': 'Ex: Trilha na serra do mar',
  'Fotografia': 'Ex: Saída fotográfica urbana',
  'Leitura': 'Ex: Clube do livro mensal',
  'Cinema': 'Ex: Sessão pipoca ao ar livre',
  'Dança': 'Ex: Aula de salsa para iniciantes',
  'Natureza': 'Ex: Piquenique no parque',
  'Fitness': 'Ex: Treino funcional ao amanhecer',
  'Educação': 'Ex: Grupo de estudos de React',
  'Social': 'Ex: Happy hour no centro',
  'Negócios': 'Ex: Networking com café',
  'Jogos': 'Ex: Noite de board games',
  'Outro': 'Ex: Encontro especial',
};

interface WizardTitleProps {
  title: string;
  category: string;
  onChange: (value: string) => void;
  onNext: () => void;
}

export const WizardTitle = memo(({ title, category, onChange, onNext }: WizardTitleProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const suggestions = useTitleSuggestions(category, title);
  const isValid = title.trim().length >= 3;
  const placeholder = CATEGORY_PLACEHOLDERS[category] || CATEGORY_PLACEHOLDERS['Outro'];

  const handleSuggestion = useCallback((s: string) => {
    onChange(s);
    setShowSuggestions(false);
  }, [onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValid) {
      e.preventDefault();
      onNext();
    }
  };

  return (
    <div className="flex flex-col items-center px-2">
      <h2 className="text-xl font-heading font-bold text-foreground text-center mb-2">
        Como você quer chamar sua atividade?
      </h2>
      <p className="text-sm text-muted-foreground text-center mb-8">
        Um bom nome ajuda as pessoas a encontrarem seu evento
      </p>

      <div className="w-full space-y-4 relative">
        <Input
          ref={inputRef}
          value={title}
          onChange={(e) => {
            onChange(e.target.value.slice(0, 60));
            setShowSuggestions(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="text-lg h-14 text-center font-medium"
          autoFocus
          autoComplete="off"
        />
        <div className="flex justify-between text-xs text-muted-foreground px-1">
          <span>{title.length}/60 caracteres</span>
          {isValid && <span className="text-primary">✓ Pronto</span>}
        </div>

        {/* Suggestions */}
        {showSuggestions && suggestions.length > 0 && title.length < 3 && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">Sugestões para {category}:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.slice(0, 5).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSuggestion(s)}
                  className="px-3 py-1.5 rounded-full text-sm border border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <Button
          type="button"
          className="w-full h-12 mt-4"
          disabled={!isValid}
          onClick={onNext}
        >
          Continuar
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
});
WizardTitle.displayName = 'WizardTitle';
