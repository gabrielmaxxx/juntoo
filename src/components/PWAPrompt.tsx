import { useState, useEffect } from 'react';
import { Download, X, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWA } from '@/hooks/usePWA';

export const PWAPrompt = () => {
  const { canInstall, isOnline, isUpdateAvailable, promptInstall, updateApp } = usePWA();
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user already dismissed the banner
    const wasDismissed = localStorage.getItem('pwa-install-dismissed');
    if (wasDismissed) {
      const dismissedDate = new Date(wasDismissed);
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      // Show again after 7 days
      if (daysSinceDismissed < 7) {
        setDismissed(true);
      }
    }
  }, []);

  useEffect(() => {
    if (canInstall && !dismissed) {
      // Delay showing the banner
      const timer = setTimeout(() => {
        setShowInstallBanner(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [canInstall, dismissed]);

  const handleInstall = async () => {
    const success = await promptInstall();
    if (success) {
      setShowInstallBanner(false);
    }
  };

  const handleDismiss = () => {
    setShowInstallBanner(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
  };

  // Offline indicator
  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 bg-destructive text-destructive-foreground py-2 px-4 flex items-center justify-center gap-2 z-50 animate-fade-in">
        <WifiOff className="w-4 h-4" aria-hidden="true" />
        <span className="text-sm font-medium">Você está offline</span>
      </div>
    );
  }

  // Update available banner
  if (isUpdateAvailable) {
    return (
      <div className="fixed bottom-20 left-4 right-4 bg-primary text-primary-foreground p-4 rounded-xl shadow-lg z-50 animate-slide-up">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5" aria-hidden="true" />
            <span className="text-sm font-medium">Nova versão disponível!</span>
          </div>
          <Button 
            size="sm" 
            variant="secondary" 
            onClick={updateApp}
            aria-label="Atualizar aplicativo"
          >
            Atualizar
          </Button>
        </div>
      </div>
    );
  }

  // Install banner
  if (showInstallBanner && canInstall) {
    return (
      <div className="fixed bottom-20 left-4 right-4 bg-card border border-border p-4 rounded-xl shadow-lg z-50 animate-slide-up">
        <button 
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <Download className="w-6 h-6 text-primary" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">Instalar Juntoo</h3>
            <p className="text-sm text-muted-foreground">Acesse mais rápido e receba notificações</p>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={handleDismiss}
          >
            Agora não
          </Button>
          <Button 
            size="sm" 
            className="flex-1"
            onClick={handleInstall}
          >
            Instalar
          </Button>
        </div>
      </div>
    );
  }

  return null;
};
