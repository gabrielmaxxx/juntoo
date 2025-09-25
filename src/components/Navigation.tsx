import { Home, Search, Calendar, User, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Navigation = ({ activeTab, onTabChange }: NavigationProps) => {
  const navItems = [
    { id: 'home', icon: Home, label: 'Início' },
    { id: 'search', icon: Search, label: 'Busca' },
    { id: 'placeholder', icon: null, label: '' }, // Placeholder for FAB
    { id: 'activities', icon: Calendar, label: 'Atividades' },
    { id: 'profile', icon: User, label: 'Perfil' },
  ];

  return (
    <>
      <nav className="bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 z-30">
        <div className="flex justify-around items-center h-16 text-gray-500 relative max-w-sm mx-auto">
          {navItems.map((item) => {
            if (item.id === 'placeholder') {
              return <div key={item.id} className="w-1/5" />;
            }
            
            const Icon = item.icon!;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex flex-col items-center justify-center w-1/5 h-full transition-juntoo ${
                  isActive ? 'text-primary' : 'text-gray-500'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs mt-1 font-medium">{item.label}</span>
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
          onClick={() => onTabChange('create')}
          className="shadow-lg"
        >
          <Plus className="w-8 h-8" />
        </Button>
      </div>
    </>
  );
};