import React from 'react';
import { User } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserAvatarProps {
  user: User;
  size?: 'sm' | 'md' | 'lg';
  showStory?: boolean;
  onClick?: (user: User) => void;
  className?: string;
}

export const UserAvatar = ({ user, size = 'md', showStory = false, onClick, className = '' }: UserAvatarProps) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const avatarClass = `${sizeClasses[size]} ${onClick ? 'cursor-pointer' : ''} ${className}`;

  const avatarElement = (
    <Avatar className={avatarClass} onClick={() => onClick?.(user)}>
      <AvatarImage src={user.avatarUrl || undefined} alt={user.name} />
      <AvatarFallback className="bg-primary/10 text-primary font-medium">
        {user.name.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );

  if (showStory) {
    return (
      <div className="flex flex-col items-center space-y-2">
        <div className="story-ring rounded-full">
          {avatarElement}
        </div>
        <span className="text-xs font-medium text-gray-700 text-center max-w-16 truncate">
          {user.name.split(' ')[0]}
        </span>
      </div>
    );
  }

  return avatarElement;
};