import { Home, Search, Calendar, User, Plus } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface BottomNavigationProps {
  onCreateClick?: () => void;
}

export const BottomNavigation = ({ onCreateClick }: BottomNavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { id: 'home', path: '/', icon: Home, label: 'Início' },
    { id: 'search', path: '/?tab=search', icon: Search, label: 'Busca' },
    { id: 'placeholder', path: '', icon: null, label: '' },
    { id: 'activities', path: '/?tab=activities', icon: Calendar, label: 'Atividades' },
    { id: 'profile', path: '/?tab=profile', icon: User, label: 'Perfil' },
  ];

  const handleNavClick = (path: string, id: string) => {
    if (id === 'home') {
      navigate('/');
    } else {
      navigate(path);
    }
  };

  const handleCreateClick = () => {
    if (onCreateClick) {
      onCreateClick();
    } else {
      navigate('/?tab=create');
    }
  };

  const isActive = (id: string) => {
    if (location.pathname !== '/') return false;
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');
    if (id === 'home' && !tab) return true;
    return tab === id;
  };

  return (
    <>
      <nav 
        className="bg-background/95 backdrop-blur-sm border-t border-border fixed bottom-0 left-0 right-0 z-30 safe-area-inset-bottom"
        role="navigation"
        aria-label="Navegação principal"
      >
        <div className="flex justify-around items-center h-14 sm:h-16 relative mx-auto max-w-lg">
          {navItems.map((item) => {
            if (item.id === 'placeholder') {
              return <div key={item.id} className="w-1/5" aria-hidden="true" />;
            }
            
            const Icon = item.icon!;
            const active = isActive(item.id);
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.path, item.id)}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center justify-center w-1/5 h-full transition-all duration-200 focus-highlight rounded-lg ${
                  active ? 'text-primary scale-105' : 'text-muted-foreground'
                }`}
              >
                <Icon className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-200 ${active ? 'scale-110' : ''}`} aria-hidden="true" />
                <span className="text-[10px] sm:text-xs mt-0.5 sm:mt-1 font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
      
      {/* Floating Action Button */}
      <div className="fixed bottom-7 sm:bottom-8 left-1/2 -translate-x-1/2 z-40">
        <Button 
          variant="fab" 
          size="fab"
          onClick={handleCreateClick}
          aria-label="Criar novo evento"
          className="shadow-lg w-12 h-12 sm:w-14 sm:h-14"
        >
          <Plus className="w-6 h-6 sm:w-8 sm:h-8" aria-hidden="true" />
        </Button>
      </div>
    </>
  );
};
