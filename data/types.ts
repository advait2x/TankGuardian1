// User types
export interface User {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string;
  isPremium: boolean;
  role: 'user' | 'creator' | 'admin';
  createdAt: string;
  goals?: string[];
}

export interface Subscription {
  userId: string;
  plan: 'monthly' | 'yearly';
  status: 'active' | 'cancelled' | 'expired';
  renewDate: string;
}

// Tank types
export type TankType = 'rectangle' | 'cube' | 'bowfront' | 'hex';
export type WaterType = 'freshwater' | 'saltwater';

export interface Tank {
  id: string;
  userId: string;
  name: string;
  type: TankType;
  sizeGallons: number;
  waterType: WaterType;
  startDate: string;
  equipmentIds: string[];
  decorIds: string[];
  plantIds: string[];
  fishInstances: FishInstance[];
  parametersLog: WaterLog[];
  tasks: Task[];
}

// Species types
export type Temperament = 'peaceful' | 'semi-aggressive' | 'aggressive';
export type Diet = 'omnivore' | 'carnivore' | 'herbivore';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface FishSpecies {
  id: string;
  commonName: string;
  scientificName: string;
  adultSizeInches: number;
  minTankGallons: number;
  temperament: Temperament;
  schooling: boolean;
  recommendedGroupSize: number;
  diet: Diet;
  difficulty: Difficulty;
  compatibilityTags: string[];
  careNotes: string;
  modelKey: string;
  imageUrl: string;
  color: string;
}

export interface FishInstance {
  instanceId: string;
  speciesId: string;
  nickname: string;
  addedAt: string;
}

// Equipment & Decor
export interface Equipment {
  id: string;
  type: 'filter' | 'heater' | 'light' | 'pump' | 'other';
  brand: string;
  name: string;
  size: string;
  notes: string;
  imageUrl: string;
  tags: string[];
}

export interface Decor {
  id: string;
  type: 'driftwood' | 'rock' | 'ornament' | 'substrate' | 'other';
  name: string;
  notes: string;
  imageUrl: string;
  tags: string[];
}

export interface Plant {
  id: string;
  commonName: string;
  scientificName: string;
  difficulty: Difficulty;
  lightRequirement: 'low' | 'medium' | 'high';
  notes: string;
  imageUrl: string;
  tags: string[];
}

// Water Parameters
export interface WaterLog {
  id: string;
  date: string;
  ph: number;
  ammonia: number;
  nitrite: number;
  nitrate: number;
  temp: number;
  notes: string;
}

// Tasks
export type TaskType = 'feed' | 'water_change' | 'test' | 'maintenance' | 'custom';
export type ScheduleType = 'daily' | 'weekly' | 'monthly' | 'custom';

export interface Task {
  id: string;
  tankId: string;
  title: string;
  type: TaskType;
  schedule: ScheduleType;
  nextDueAt: string;
  frequencyConfig: {
    intervalDays?: number;
    timeOfDay?: string;
    dayOfWeek?: number;
  };
  completedHistory: string[];
}

// Community
export interface Post {
  id: string;
  authorId: string;
  createdAt: string;
  text: string;
  tankId?: string;
  mediaUrl: string;
  likesCount: number;
  commentsCount: number;
  comments?: Comment[];
}

export interface Comment {
  id: string;
  authorId: string;
  text: string;
  createdAt: string;
}

// Messaging
export interface MessageThread {
  threadId: string;
  participantIds: string[];
  lastMessageAt: string;
  messages: Message[];
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
}

// Disease Check
export interface DiseaseCheckResult {
  id: string;
  tankId: string;
  fishInstanceId?: string;
  createdAt: string;
  symptoms: string[];
  photoUrl: string;
  diagnosis: {
    issue: string;
    confidence: number;
    description: string;
    immediateActions: string[];
    disclaimer: string;
  };
}

// App State
export interface AppState {
  currentUser: User | null;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  selectedTankId: string | null;
}
