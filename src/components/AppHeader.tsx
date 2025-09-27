import { Bell, MessageCircle, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

export const AppHeader = () => {
  const { signOut } = useAuth();

  return (
    <header className="juntoo-gradient p-4 flex items-center justify-between h-20 text-primary-foreground sticky top-0 z-20">
      <h1 className="text-3xl font-bold font-poppins tracking-wide drop-shadow-lg">juntoo</h1>
      
      <div className="flex items-center space-x-4">
        <button className="p-2 hover:bg-white/20 rounded-full transition-colors">
          <MessageCircle size={20} className="text-white" />
        </button>
        <button className="p-2 hover:bg-white/20 rounded-full transition-colors relative">
          <Bell size={20} className="text-white" />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            3
          </span>
        </button>
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="p-2 hover:bg-white/20 rounded-full transition-colors"
          title="Sair"
        >
          <LogOut size={20} className="text-white" />
        </Button>
      </div>
    </header>
  );
};