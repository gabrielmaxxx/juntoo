import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

interface Friend {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  city: string | null;
}

interface ProfileFriendsProps {
  friends: Friend[];
}

export const ProfileFriends = ({ friends }: ProfileFriendsProps) => {
  const navigate = useNavigate();

  if (friends.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nenhum amigo ainda</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {friends.map((friend) => (
        <Card 
          key={friend.user_id} 
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => navigate(`/user/${friend.user_id}`)}
        >
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              {friend.avatar_url ? (
                <img 
                  src={friend.avatar_url} 
                  alt={friend.full_name}
                  className="w-14 h-14 rounded-full object-cover"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-medium text-primary">
                    {friend.full_name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{friend.full_name}</h3>
                {friend.city && (
                  <p className="text-sm text-muted-foreground flex items-center">
                    <MapPin className="w-3 h-3 mr-1" />
                    {friend.city}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
