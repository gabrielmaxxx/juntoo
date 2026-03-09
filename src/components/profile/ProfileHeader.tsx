import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Star, MapPin, Camera, Edit3, UserPlus } from 'lucide-react';


interface ProfileHeaderProps {
  displayName: string;
  displayAvatar: string;
  displayLocation: string;
  userNumber: string;
  selectedInterests: string[];
  uploadingAvatar: boolean;
  averageRating?: number;
  totalReviews?: number;
  onAvatarUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onEditClick: () => void;
}

export const ProfileHeader = ({
  displayName,
  displayAvatar,
  displayLocation,
  userNumber,
  selectedInterests,
  uploadingAvatar,
  averageRating = 0,
  totalReviews = 0,
  onAvatarUpload,
  onEditClick,
}: ProfileHeaderProps) => {
  const navigate = useNavigate();

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
        }`}
      />
    ));
  };

  return (
    <div className="bg-background p-6 border-b border-border">
      <div className="flex items-start gap-4 mb-4">
        <div className="flex items-center space-x-4 flex-1 min-w-0">
          <div className="relative shrink-0">
            <Avatar className="w-20 h-20 cursor-pointer" onClick={() => document.getElementById('avatarUpload')?.click()}>
              <AvatarImage src={displayAvatar} alt={displayName} />
              <AvatarFallback className="bg-primary/10 text-primary font-medium text-3xl">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Label htmlFor="avatarUpload" className="absolute -bottom-1 -right-1 cursor-pointer">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors">
                {uploadingAvatar ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </div>
            </Label>
            <Input
              id="avatarUpload"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={onAvatarUpload}
              className="hidden"
              disabled={uploadingAvatar}
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground truncate">{displayName}</h1>
            {userNumber && (
              <p className="text-sm text-muted-foreground">ID: {userNumber}</p>
            )}
            {displayLocation && (
              <p className="text-muted-foreground flex items-center text-sm">
                <MapPin className="w-4 h-4 mr-1 shrink-0" />
                <span className="truncate">{displayLocation}</span>
              </p>
            )}
            <div className="flex items-center mt-1">
              {renderStars(averageRating)}
              <span className="ml-2 text-sm text-muted-foreground whitespace-nowrap">
                ({totalReviews} {totalReviews === 1 ? 'avaliação' : 'avaliações'})
              </span>
            </div>
          </div>
        </div>
        
        <div className="shrink-0" />
      </div>

      <div className="flex gap-2 mb-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate('/friend-suggestions')}
          aria-label="Encontrar amigos"
        >
          <UserPlus className="w-4 h-4 mr-2" aria-hidden="true" />
          Encontrar
        </Button>
        
        <Button variant="outline" size="sm" onClick={onEditClick} aria-label="Editar perfil">
          <Edit3 className="w-4 h-4 mr-2" aria-hidden="true" />
          Editar
        </Button>
      </div>

      {/* Interests */}
      {selectedInterests && selectedInterests.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">Interesses</h3>
          <div className="flex flex-wrap gap-2">
            {selectedInterests.map((interest, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {interest}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
