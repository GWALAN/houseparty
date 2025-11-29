// Common types used throughout the application

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Place {
  id: string;
  name: string;
  location: string;
  description?: string;
  image?: string;
  visitors: number;
  lastActivity: Date;
}

export interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export interface MenuItem {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress?: () => void;
}

// Navigation types
export type RootTabParamList = {
  index: undefined;
  explore: undefined;
  profile: undefined;
};