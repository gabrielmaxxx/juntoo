import { ArrowLeft, FileText, Shield, Heart, ExternalLink, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import juntooLogo from '@/assets/juntoo-logo.png';
import logoText from '@/assets/logo-text-white.png';

interface AboutPageProps {
  onBack: () => void;
}

export const AboutPage = ({ onBack }: AboutPageProps) => {
  return (
    <div className="pb-20 bg-background min-h-screen">
      <div className="bg-card border-b border-border p-4 flex items-center gap-3 sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Sobre o Juntoo</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* App Info */}
        <div className="flex flex-col items-center py-6">
          <div className="flex flex-col items-center gap-3">
            <img 
              src={juntooLogo} 
              alt="Juntoo" 
              className="w-20 h-20 object-contain rounded-[1.5rem]"
            />
            <img 
              src={logoText} 
              alt="Juntoo" 
              className="h-8 w-auto object-contain"
            />
          </div>
          <p className="text-sm text-muted-foreground mt-1">Versão 1.0.0</p>
          <p className="text-sm text-muted-foreground text-center mt-3 max-w-xs">
            Conectando pessoas através de eventos e experiências compartilhadas.
          </p>
        </div>

        {/* Links */}
        <Card>
          <CardContent className="p-0 divide-y divide-border">
            <a href="#" className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground flex-1">Termos de Uso</span>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors">
              <Shield className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground flex-1">Política de Privacidade</span>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors">
              <Globe className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground flex-1">Licenças de código aberto</span>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </a>
          </CardContent>
        </Card>

        {/* Credits */}
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            Feito com <Heart className="w-3 h-3 text-destructive inline" /> no Brasil
          </p>
          <p className="text-xs text-muted-foreground mt-1">© 2026 Juntoo. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
};
