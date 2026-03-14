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
        className="bg-background/95 backdrop-blur-md border-t border-border/50 fixed bottom-0 left-0 right-0 z-30 safe-area-inset-bottom"
        role="navigation"
        aria-label="Navegação principal"
      >
        <div className="flex justify-around items-center h-16 relative mx-auto max-w-lg">
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
                  active ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon className={`w-5 h-5 transition-all duration-200 ${active ? 'scale-110' : ''}`} aria-hidden="true" />
                <span className={`text-[10px] mt-1 transition-all duration-200 ${active ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                {active && (
                  <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
      
      {/* Floating Action Button */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40">
        <Button 
          variant="fab" 
          size="fab"
          onClick={handleCreateClick}
          aria-label="Criar novo evento"
          className="w-14 h-14 shadow-lg"
        >
          <Plus className="w-7 h-7" aria-hidden="true" />
        </Button>
      </div>
    </>
  );
};
