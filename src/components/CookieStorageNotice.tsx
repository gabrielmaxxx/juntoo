import { useEffect, useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_NOTICE_KEY = 'juntoo-storage-notice-accepted';

export const CookieStorageNotice = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(localStorage.getItem(STORAGE_NOTICE_KEY) !== 'true');
  }, []);

  const acceptNotice = () => {
    localStorage.setItem(STORAGE_NOTICE_KEY, 'true');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-2xl border border-border bg-card p-4 shadow-lg md:bottom-6">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-semibold text-foreground">Usamos armazenamento local</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            O Juntoo usa cookies técnicos, localStorage e cache do app para manter sua sessão, preferências e melhorar sua experiência.
            Saiba mais na <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline">Política de Privacidade</a>.
          </p>
          <Button size="sm" className="h-9 rounded-full px-5" onClick={acceptNotice}>Entendi</Button>
        </div>
        <button type="button" onClick={acceptNotice} className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Fechar aviso">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
