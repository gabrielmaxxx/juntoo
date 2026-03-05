import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandLogo } from './BrandLogo';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
}

export const Header = ({ title, showBack, onBack }: HeaderProps) => {
  return (
    <header className="juntoo-gradient p-4 flex items-center justify-between h-20 text-primary-foreground sticky top-0 z-20">
      {showBack ? (
        <Button variant="ghost" size="icon" onClick={onBack} className="text-white hover:bg-white/20">
          <ArrowLeft className="w-6 h-6" />
        </Button>
      ) : (
        <div className="w-10" />
      )}
      
      {title ? (
        <h2 className="text-xl font-semibold font-poppins truncate px-2">{title}</h2>
      ) : (
        <BrandLogo size="sm" showLabel labelClassName="text-xl tracking-[0.22em]" />
      )}
      
      <div className="w-10" />
    </header>
  );
};