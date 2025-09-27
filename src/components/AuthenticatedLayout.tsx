import { Header } from '@/components/Header';
import { Navigation } from '@/components/Navigation';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const AuthenticatedLayout = ({ children, activeTab, onTabChange }: AuthenticatedLayoutProps) => {
  return (
    <div className="grid grid-rows-[auto_1fr_auto] h-full">
      {/* Header */}
      <Header />
      
      {/* Main Content */}
      <main className="overflow-y-auto">
        {children}
      </main>
      
      {/* Navigation */}
      <Navigation activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  );
};