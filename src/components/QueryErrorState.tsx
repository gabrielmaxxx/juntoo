import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QueryErrorStateProps {
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
}

export const QueryErrorState = ({ 
  message = 'Não foi possível carregar os dados.', 
  onRetry, 
  compact = false 
}: QueryErrorStateProps) => {
  const isOffline = !navigator.onLine;

  if (compact) {
    return (
      <div className="flex items-center gap-3 bg-destructive/5 border border-destructive/20 rounded-xl p-3">
        {isOffline ? (
          <WifiOff className="w-4 h-4 text-destructive flex-shrink-0" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
        )}
        <p className="text-xs text-muted-foreground flex-1">
          {isOffline ? 'Sem conexão com a internet.' : message}
        </p>
        {onRetry && (
          <Button size="sm" variant="ghost" onClick={onRetry} className="h-7 px-2 text-xs">
            <RefreshCw className="w-3 h-3 mr-1" />
            Tentar
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        {isOffline ? (
          <WifiOff className="w-7 h-7 text-destructive" />
        ) : (
          <AlertTriangle className="w-7 h-7 text-destructive" />
        )}
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">
        {isOffline ? 'Sem conexão' : 'Erro ao carregar'}
      </h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-xs">
        {isOffline 
          ? 'Verifique sua conexão com a internet e tente novamente.' 
          : message}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Tentar novamente
        </Button>
      )}
    </div>
  );
};
