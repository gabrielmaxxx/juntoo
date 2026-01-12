import { ArrowLeft, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EventHeroProps {
  imageUrl: string;
  title: string;
  onBack: () => void;
}

export const EventHero = ({ imageUrl, title, onBack }: EventHeroProps) => {
  return (
    <div className="relative w-full h-48 sm:h-56 md:h-64 flex-shrink-0">
      <img 
        src={imageUrl} 
        alt={title}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      
      <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
        className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-black/20 text-white hover:bg-black/40 h-9 w-9 sm:h-10 sm:w-10"
      >
        <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-black/20 text-white hover:bg-black/40 h-9 w-9 sm:h-10 sm:w-10"
      >
        <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
      </Button>
    </div>
  );
};
