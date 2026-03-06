import { ArrowLeft, Moon, Sun, Monitor, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from 'next-themes';

interface AppearanceSettingsProps {
  onBack: () => void;
}

const THEME_OPTIONS = [
  { value: 'light', label: 'Claro', icon: Sun, description: 'Tema claro padrão' },
  { value: 'dark', label: 'Escuro', icon: Moon, description: 'Tema escuro para ambientes com pouca luz' },
  { value: 'system', label: 'Sistema', icon: Monitor, description: 'Seguir configuração do dispositivo' },
] as const;

export const AppearanceSettings = ({ onBack }: AppearanceSettingsProps) => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="pb-20 bg-background min-h-screen">
      <div className="bg-card border-b border-border p-4 flex items-center gap-3 sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Aparência</h1>
      </div>

      <div className="p-4 space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Tema</CardTitle>
            <CardDescription>Escolha o visual da interface</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {THEME_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isActive = theme === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    isActive
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div className="text-left flex-1">
                    <p className={`text-sm font-medium ${isActive ? 'text-primary' : 'text-foreground'}`}>{option.label}</p>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                  {isActive && (
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Type className="h-5 w-5 text-primary" />
              Idioma
            </CardTitle>
            <CardDescription>Idioma da interface</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-primary bg-primary/5 ring-1 ring-primary">
              <span className="text-xl">🇧🇷</span>
              <div className="text-left">
                <p className="text-sm font-medium text-primary">Português (Brasil)</p>
                <p className="text-xs text-muted-foreground">Idioma padrão</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
