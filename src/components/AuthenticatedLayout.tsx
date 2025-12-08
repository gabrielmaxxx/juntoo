import { Header } from '@/components/Header';
import { Navigation } from '@/components/Navigation';
import { SkipLink } from '@/components/SkipLink';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const AuthenticatedLayout = ({ children, activeTab, onTabChange }: AuthenticatedLayoutProps) => {
  return (
    <div className="grid grid-rows-[auto_1fr_auto] h-full">
      {/* Skip Link for Accessibility */}
      <SkipLink />
      
      {/* Header */}
      <Header />
      
      {/* Main Content */}
      <main id="main-content" className="overflow-y-auto" tabIndex={-1}>
        {children}
      </main>
      
      {/* Navigation */}
      <Navigation activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  );
};
