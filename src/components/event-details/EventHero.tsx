import { ArrowLeft, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EventHeroProps {
  imageUrl: string;
  title: string;
  onBack: () => void;
}

export const EventHero = ({ imageUrl, title, onBack }: EventHeroProps) => {
  return (
    <div className="relative w-full h-56 sm:h-64 md:h-72 flex-shrink-0">
      <img 
        src={imageUrl} 
        alt={title}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/20" />
      
      {/* Top actions */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
        className="absolute top-4 left-4 bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 h-10 w-10 rounded-full"
      >
        <ArrowLeft className="w-5 h-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 h-10 w-10 rounded-full"
      >
        <Share2 className="w-5 h-5" />
      </Button>

      {/* Title overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <h1 className="text-white text-xl sm:text-2xl font-bold leading-tight line-clamp-2">{title}</h1>
      </div>
    </div>
  );
};
