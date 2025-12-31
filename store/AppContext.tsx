import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Tank, Task, Post, MessageThread, WaterLog, FishInstance } from '@/data/types';
import { 
  sampleUsers, 
  sampleTanks, 
  samplePosts, 
  sampleThreads, 
  sampleWaterLogs,
  generateDefaultTasks,
  generateId
} from '@/data/mockData';

interface AppContextType {
  // Auth State
  currentUser: User | null;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  isPremium: boolean;
  hasUsedFreeTrial: boolean;
  
  // User Actions
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, displayName: string) => Promise<boolean>;
  logout: () => void;
  completeOnboarding: () => void;
  updateUser: (updates: Partial<User>) => void;
  setPremium: (value: boolean) => void;
  useFreeTrial: () => void;
  
  // Tank State & Actions
  tanks: Tank[];
  selectedTankId: string | null;
  selectTank: (tankId: string) => void;
  createTank: (tank: Omit<Tank, 'id' | 'tasks' | 'parametersLog'>) => Tank;
  updateTank: (tankId: string, updates: Partial<Tank>) => void;
  deleteTank: (tankId: string) => void;
  addFishToTank: (tankId: string, fish: FishInstance) => void;
  removeFishFromTank: (tankId: string, instanceId: string) => void;
  addWaterLog: (tankId: string, log: Omit<WaterLog, 'id'>) => void;
  
  // Tasks
  tasks: Task[];
  completeTask: (taskId: string) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  
  // Community
  posts: Post[];
  users: User[];
  createPost: (text: string, mediaUrl?: string, tankId?: string) => void;
  likePost: (postId: string) => void;
  
  // Messages
  threads: MessageThread[];
  sendMessage: (threadId: string, text: string) => void;
  createThread: (participantId: string) => string;
  
  // Loading states
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isPremium, setIsPremiumState] = useState(false);
  const [hasUsedFreeTrial, setHasUsedFreeTrial] = useState(false);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [selectedTankId, setSelectedTankId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [posts, setPosts] = useState<Post[]>(samplePosts);
  const [users] = useState<User[]>(sampleUsers);
  const [threads, setThreads] = useState<MessageThread[]>(sampleThreads);
  const [isLoading, setIsLoading] = useState(false); // MVP: no async loading

  // Auth Actions
  const login = async (email: string, password: string): Promise<boolean> => {
    // Mock login - in real app would validate credentials
    const mockUser: User = {
      id: generateId(),
      handle: email.split('@')[0],
      displayName: email.split('@')[0],
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80',
      isPremium: false,
      role: 'user',
      createdAt: new Date().toISOString(),
    };
    
    setCurrentUser(mockUser);
    setIsAuthenticated(true);
    return true;
  };

  const signup = async (email: string, password: string, displayName: string): Promise<boolean> => {
    const newUser: User = {
      id: generateId(),
      handle: displayName.toLowerCase().replace(/\s+/g, '_'),
      displayName,
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80',
      isPremium: false,
      role: 'user',
      createdAt: new Date().toISOString(),
    };

    setCurrentUser(newUser);
    setIsAuthenticated(true);
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    setHasCompletedOnboarding(false);
    setTanks([]);
    setSelectedTankId(null);
    setTasks([]);
  };

  const completeOnboarding = () => {
    setHasCompletedOnboarding(true);
  };

  const updateUser = (updates: Partial<User>) => {
    if (currentUser) {
      const updatedUser = { ...currentUser, ...updates };
      setCurrentUser(updatedUser);
    }
  };

  const setPremium = (value: boolean) => {
    setIsPremiumState(value);
    if (currentUser) {
      const updatedUser = { ...currentUser, isPremium: value };
      setCurrentUser(updatedUser);
    }
  };

  const useFreeTrial = () => {
    setHasUsedFreeTrial(true);
  };

  // Tank Actions
  const selectTank = (tankId: string) => {
    setSelectedTankId(tankId);
  };

  const createTank = (tankData: Omit<Tank, 'id' | 'tasks' | 'parametersLog'>): Tank => {
    const tankId = generateId();
    const defaultTasks = generateDefaultTasks(tankId);
    
    const newTank: Tank = {
      ...tankData,
      id: tankId,
      tasks: defaultTasks,
      parametersLog: [],
    };

    const updatedTanks = [...tanks, newTank];
    setTanks(updatedTanks);
    setSelectedTankId(tankId);
    setTasks([...tasks, ...defaultTasks]);
    
    return newTank;
  };

  const updateTank = (tankId: string, updates: Partial<Tank>) => {
    const updatedTanks = tanks.map(t => 
      t.id === tankId ? { ...t, ...updates } : t
    );
    setTanks(updatedTanks);
  };

  const deleteTank = (tankId: string) => {
    const updatedTanks = tanks.filter(t => t.id !== tankId);
    setTanks(updatedTanks);
    setTasks(tasks.filter(t => t.tankId !== tankId));
    if (selectedTankId === tankId) {
      setSelectedTankId(updatedTanks.length > 0 ? updatedTanks[0].id : null);
    }
  };

  const addFishToTank = (tankId: string, fish: FishInstance) => {
    const updatedTanks = tanks.map(t => {
      if (t.id === tankId) {
        return { ...t, fishInstances: [...t.fishInstances, fish] };
      }
      return t;
    });
    setTanks(updatedTanks);
  };

  const removeFishFromTank = (tankId: string, instanceId: string) => {
    const updatedTanks = tanks.map(t => {
      if (t.id === tankId) {
        return { 
          ...t, 
          fishInstances: t.fishInstances.filter(f => f.instanceId !== instanceId) 
        };
      }
      return t;
    });
    setTanks(updatedTanks);
  };

  const addWaterLog = (tankId: string, log: Omit<WaterLog, 'id'>) => {
    const newLog: WaterLog = { ...log, id: generateId() };
    const updatedTanks = tanks.map(t => {
      if (t.id === tankId) {
        return { ...t, parametersLog: [newLog, ...t.parametersLog] };
      }
      return t;
    });
    setTanks(updatedTanks);
  };

  // Task Actions
  const completeTask = (taskId: string) => {
    const now = new Date().toISOString();
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        const newHistory = [...t.completedHistory, now];
        let nextDue = new Date();
        
        switch (t.schedule) {
          case 'daily':
            nextDue.setDate(nextDue.getDate() + 1);
            break;
          case 'weekly':
            nextDue.setDate(nextDue.getDate() + 7);
            break;
          case 'monthly':
            nextDue.setMonth(nextDue.getMonth() + 1);
            break;
          default:
            nextDue.setDate(nextDue.getDate() + (t.frequencyConfig.intervalDays || 1));
        }
        
        return { ...t, completedHistory: newHistory, nextDueAt: nextDue.toISOString() };
      }
      return t;
    });
    
    setTasks(updatedTasks);
    
    // Update tasks in tanks
    const updatedTanks = tanks.map(tank => ({
      ...tank,
      tasks: updatedTasks.filter(t => t.tankId === tank.id),
    }));
    setTanks(updatedTanks);
  };

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    const updatedTasks = tasks.map(t => 
      t.id === taskId ? { ...t, ...updates } : t
    );
    setTasks(updatedTasks);
    
    const updatedTanks = tanks.map(tank => ({
      ...tank,
      tasks: updatedTasks.filter(t => t.tankId === tank.id),
    }));
    setTanks(updatedTanks);
  };

  // Community Actions
  const createPost = (text: string, mediaUrl?: string, tankId?: string) => {
    if (!currentUser) return;
    
    const newPost: Post = {
      id: generateId(),
      authorId: currentUser.id,
      createdAt: new Date().toISOString(),
      text,
      mediaUrl: mediaUrl || 'https://images.unsplash.com/photo-1520302519878-3e5e3b5c4d2c?w=600&q=80',
      tankId,
      likesCount: 0,
      commentsCount: 0,
    };
    
    setPosts([newPost, ...posts]);
  };

  const likePost = (postId: string) => {
    setPosts(posts.map(p => 
      p.id === postId ? { ...p, likesCount: p.likesCount + 1 } : p
    ));
  };

  // Message Actions
  const sendMessage = (threadId: string, text: string) => {
    if (!currentUser) return;
    
    const newMessage = {
      id: generateId(),
      senderId: currentUser.id,
      text,
      createdAt: new Date().toISOString(),
    };
    
    setThreads(threads.map(t => 
      t.threadId === threadId 
        ? { 
            ...t, 
            messages: [...t.messages, newMessage],
            lastMessageAt: newMessage.createdAt,
          } 
        : t
    ));
  };

  const createThread = (participantId: string): string => {
    if (!currentUser) return '';
    
    // Check if thread already exists
    const existingThread = threads.find(t => 
      t.participantIds.includes(currentUser.id) && t.participantIds.includes(participantId)
    );
    
    if (existingThread) return existingThread.threadId;
    
    const newThread: MessageThread = {
      threadId: generateId(),
      participantIds: [currentUser.id, participantId],
      lastMessageAt: new Date().toISOString(),
      messages: [],
    };
    
    setThreads([...threads, newThread]);
    return newThread.threadId;
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        hasCompletedOnboarding,
        isPremium,
        hasUsedFreeTrial,
        login,
        signup,
        logout,
        completeOnboarding,
        updateUser,
        setPremium,
        useFreeTrial,
        tanks,
        selectedTankId,
        selectTank,
        createTank,
        updateTank,
        deleteTank,
        addFishToTank,
        removeFishFromTank,
        addWaterLog,
        tasks,
        completeTask,
        updateTask,
        posts,
        users,
        createPost,
        likePost,
        threads,
        sendMessage,
        createThread,
        isLoading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
