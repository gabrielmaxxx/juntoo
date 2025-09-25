export interface Event {
  id: string;
  title: string;
  category: string;
  subtitle?: string;
  location: string;
  date: string;
  time: string;
  price: string;
  description: string;
  imageUrl: string;
  isTrending?: boolean;
  isFeatured?: boolean;
  attendees: string[];
  createdBy?: string;
  friendsGoing?: string[];
  distance?: string;
}

export interface User {
  id: string;
  name: string;
  avatarUrl: string;
  bio?: string;
  rating?: number;
  reviews?: number;
  location?: string;
  interests?: string[];
  badges?: Badge[];
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