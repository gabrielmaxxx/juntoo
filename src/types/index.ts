export interface Event {
  id: string;
  title: string;
  category: string;
  subtitle?: string;
  location: string;
  state?: string;
  city?: string;
  date: string;
  time: string;
  price: string;
  description: string;
  imageUrl: string;
  isTrending?: boolean;
  isFeatured?: boolean;
  attendees: string[];
  createdBy?: string;
  creatorAvatar?: string;
  creatorName?: string;
  friendsGoing?: string[];
  distance?: string;
  isRecurring?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  bio?: string;
  rating?: number;
  reviews?: number;
  location?: string;
  interests?: string[];
  badges?: Badge[];
  eventsAttended?: Event[];
  eventsRegistered?: Event[];
  posts?: UserPost[];
  stories?: Story[];
  registeredEvents?: Event[];
  attendedEvents?: Event[];
}

export interface UserPost {
  id: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
  likes: number;
  comments: number;
}

export interface Story {
  id: string;
  imageUrl: string;
  createdAt: string;
  expiresAt: string;
}

export interface Badge {
  name: string;
  icon: string;
  color: string;
}

export interface Category {
  name: string;
  icon: string;
}