import { User } from '@/types';

interface UserAvatarProps {
  user: User;
  size?: 'sm' | 'md' | 'lg';
  showStory?: boolean;
  onClick?: (user: User) => void;
}

export const UserAvatar = ({ user, size = 'md', showStory = false, onClick }: UserAvatarProps) => {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16', 
    lg: 'w-20 h-20'
  };

  const avatarElement = (
    <img 
      src={user.avatarUrl} 
      alt={user.name}
      className={`${sizeClasses[size]} rounded-full object-cover ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={() => onClick?.(user)}
    />
  );

  if (showStory) {
    return (
      <div className="flex flex-col items-center space-y-2">
        <div className="story-ring rounded-full">
          {avatarElement}
        </div>
        <span className="text-xs font-medium text-gray-700 text-center max-w-16 truncate">
          {user.name}
        </span>
      </div>
    );
  }

  return avatarElement;
};