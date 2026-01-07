import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { User, Tank, Task, WaterLog, FishInstance } from '@/data/types';
import {
  generateDefaultTasks,
  generateId,
} from '@/data/mockData';
import { migrateSpeciesSlugs } from '@/utils/speciesSlugMigration';
import { normalizeSpeciesSlug } from '@/utils/slugifySpecies';
import { useAuth } from './AuthContext';
import * as TankAdapter from '@/utils/tanksAdapter';
import { isValidUUID } from '@/utils/remoteTanks';
import { supabase } from '@/utils/supabase';
import * as RemoteProfiles from '@/utils/remoteProfiles';

interface AppContextType {
  // Auth State
  currentUser: User | null;
  isAuthenticated: boolean;
  // hasCompletedOnboarding: REMOVED - use AuthContext.onboardingStatus instead
  profileLoading: boolean;
  isPremium: boolean;
  hasUsedFreeTrial: boolean;
  diseaseCheckCount: number;

  // User Actions
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, displayName: string) => Promise<boolean>;
  logout: () => Promise<void>;
  // completeOnboarding: REMOVED - use AuthContext.refreshProfile + RemoteProfiles.setOnboardingComplete
  updateUser: (updates: Partial<User>) => void;
  setPremium: (value: boolean) => void;
  useFreeTrial: () => void;
  incrementDiseaseCheck: () => void;

  // Tank State & Actions
  tanks: Tank[];
  selectedTankId: string | null;
  selectTank: (tankId: string) => void;
  createTank: (tank: Omit<Tank, 'id' | 'tasks' | 'parametersLog'>) => Promise<Tank>;
  updateTank: (tankId: string, updates: Partial<Tank>) => Promise<void>;
  deleteTank: (tankId: string) => Promise<void>;
  addFishToTank: (tankId: string, fish: FishInstance) => void;
  addFishInstances: (tankId: string, speciesId: string, quantity: number) => Promise<void>;
  removeFishFromTank: (tankId: string, instanceId: string) => Promise<void>;
  addWaterLog: (tankId: string, log: Omit<WaterLog, 'id'>) => void;

  // Tasks
  tasks: Task[];
  completeTask: (taskId: string) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;

  // Loading states
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  // Auth from Supabase (single source of truth)
  const { user: authUser, session, loading: authLoading } = useAuth();
  const isAuthed = !!session?.user;

  // Local user model used by UI
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // onboarding status: REMOVED - AuthContext is single source of truth
  const [profileLoading, setProfileLoading] = useState(false);

  // Misc app state
  const [isPremium, setIsPremiumState] = useState(false);
  const [hasUsedFreeTrial, setHasUsedFreeTrial] = useState(false);
  const [diseaseCheckCount, setDiseaseCheckCount] = useState(0);

  // Tanks
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [selectedTankId, setSelectedTankId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [isLoading, setIsLoading] = useState(false);

  // Derived auth flag for UI
  const isAuthenticated = useMemo(() => isAuthed, [isAuthed]);

  /**
   * Keep currentUser in sync with Supabase auth user.
   * Load onboarding state from Supabase profiles table.
   */
  useEffect(() => {
    if (authLoading) return;

    if (!authUser || !session?.user) {
      // Logged out - clear ALL state
      console.log('[Auth] User logged out');
      setCurrentUser(null);
      // hasCompletedOnboarding: REMOVED - AuthContext handles onboarding
      setProfileLoading(false);
      setIsPremiumState(false);
      setTanks([]);
      setSelectedTankId(null);
      setTasks([]);
      setIsLoading(false);
      return;
    }

    // Logged in - fetch profile data from Supabase
    async function loadUserProfile() {
      setProfileLoading(true);
      setIsLoading(true);
      
      const userId = session.user.id;
      console.log('[Auth] Session user id:', userId);

      // Ensure profile exists, then get it (NEVER sets has_completed_onboarding to false)
      const result = await RemoteProfiles.ensureProfile(userId);
      
      if (result.profile) {
        // Create user object from profile data
        const u: User = {
          id: authUser.id,
          handle: authUser.email ? authUser.email.split('@')[0] : `user_${authUser.id.slice(0, 6)}`,
          displayName: (authUser.user_metadata?.display_name as string) ||
            (authUser.email ? authUser.email.split('@')[0] : 'User'),
          avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80',
          isPremium: false,
          role: 'user',
          createdAt: new Date().toISOString(),
          hasCompletedOnboarding: result.profile.has_completed_onboarding,
        };

        setCurrentUser(u);
        // hasCompletedOnboarding: REMOVED - use AuthContext.onboardingStatus
        console.log('[Profile] Loaded { id:', result.profile.id, ', has_completed_onboarding:', result.profile.has_completed_onboarding, '}');
      } else {
        // Failed to load profile - keep as null (unknown), do NOT default to false
        console.error('[Profile] Failed to load, RLS or network error:', result.error);
        console.error('[Profile] Creating fallback user without profile data');
        const u: User = {
          id: authUser.id,
          handle: authUser.email ? authUser.email.split('@')[0] : `user_${authUser.id.slice(0, 6)}`,
          displayName: (authUser.user_metadata?.display_name as string) ||
            (authUser.email ? authUser.email.split('@')[0] : 'User'),
          avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80',
          isPremium: false,
          role: 'user',
          createdAt: new Date().toISOString(),
          hasCompletedOnboarding: false,
        };
        setCurrentUser(u);
        // hasCompletedOnboarding: REMOVED - use AuthContext.onboardingStatus
      }

      setProfileLoading(false);
      setIsLoading(false);
    }

    loadUserProfile();
  }, [authUser, session?.user?.id, authLoading]);

  // Load tanks from Supabase when authenticated
  useEffect(() => {
    async function loadTanks() {
      if (authLoading) return;

      if (isAuthed && authUser && session) {
        setIsLoading(true);
        console.log('[AppContext] Loading tanks for authenticated user:', authUser.id);

        const result = await TankAdapter.fetchUserTanks(authUser.id);

        if (result.ok && result.tanks) {
          console.log('[AppContext] Loaded remote tanks:', result.tanks.length);
          const migratedTanks = migrateSpeciesSlugs(result.tanks);
          setTanks(migratedTanks);

          if (migratedTanks.length > 0) {
            const selectedExists = selectedTankId && migratedTanks.some(t => t.id === selectedTankId);
            if (!selectedExists) setSelectedTankId(migratedTanks[0].id);
          } else {
            setSelectedTankId(null);
          }

          const allTasks = migratedTanks.flatMap(tank =>
            tank.tasks.length > 0 ? tank.tasks : generateDefaultTasks(tank.id)
          );
          setTasks(allTasks);
        } else {
          console.error('[AppContext] Failed to load tanks:', result.error);
          setTanks([]);
          setSelectedTankId(null);
          setTasks([]);
        }

        setIsLoading(false);
      } else {
        console.log('[AppContext] Clearing tanks (logged out)');
        setTanks([]);
        setSelectedTankId(null);
        setTasks([]);
      }
    }

    loadTanks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed, authUser?.id, authLoading]);

  // Run species slug migration once on mount (safe)
  useEffect(() => {
    if (tanks.length > 0) {
      try {
        const migratedTanks = migrateSpeciesSlugs(tanks);
        if (JSON.stringify(migratedTanks) !== JSON.stringify(tanks)) {
          setTanks(migratedTanks);
        }
      } catch (error) {
        if (__DEV__) console.warn('[AppContext] Migration failed:', error);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auth Actions (delegate to AuthContext/Supabase)
  // These are kept for backwards compatibility but AuthContext is the source of truth
  const login = async (email: string, password: string): Promise<boolean> => {
    // Auth is handled by Supabase in login.tsx directly
    // This is kept for compatibility but should not be used
    console.warn('[AppContext] login() called - use Supabase auth directly instead');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('[Auth] login error:', error.message);
      return false;
    }
    return true;
  };

  const signup = async (email: string, password: string, displayName: string): Promise<boolean> => {
    // Auth is handled by Supabase in signup.tsx directly  
    // This is kept for compatibility but should not be used
    console.warn('[AppContext] signup() called - use Supabase auth directly instead');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });

    if (error) {
      console.error('[Auth] signup error:', error.message);
      return false;
    }
    return true;
  };

  const logout = async () => {
    console.log('[AppContext] Logging out - clearing all data');
    // Clear state immediately before auth signout
    setTanks([]);
    setSelectedTankId(null);
    setTasks([]);
    setCurrentUser(null);
    // hasCompletedOnboarding: REMOVED - AuthContext handles this
    setProfileLoading(false);
    
    await supabase.auth.signOut();
    // Auth sync useEffect will re-confirm cleared state
  };

  // completeOnboarding: REMOVED
  // Use AuthContext.refreshProfile() + RemoteProfiles.setOnboardingComplete() instead
  // Example:
  //   await RemoteProfiles.setOnboardingComplete(session.user.id);
  //   await refreshProfile(); // from AuthContext

  const updateUser = (updates: Partial<User>) => {
    if (currentUser) setCurrentUser({ ...currentUser, ...updates });
  };

  const setPremium = (value: boolean) => {
    setIsPremiumState(value);
    if (currentUser) setCurrentUser({ ...currentUser, isPremium: value });
  };

  const useFreeTrial = () => setHasUsedFreeTrial(true);
  const incrementDiseaseCheck = () => setDiseaseCheckCount(prev => prev + 1);

  // Tank Actions
  const selectTank = (tankId: string) => setSelectedTankId(tankId);

  const createTank = async (
    tankData: Omit<Tank, 'id' | 'tasks' | 'parametersLog'>
  ): Promise<Tank> => {
    if (!isAuthed || !authUser || !session) {
      console.error('[AppContext] Cannot create tank: user not authenticated');
      throw new Error('Authentication required to create tanks');
    }

    const result = await TankAdapter.saveTank({
      ownerId: session.user.id,
      name: tankData.name,
      tankType: tankData.type,
      sizeGallons: tankData.sizeGallons,
      waterType: tankData.waterType,
      startDate: tankData.startDate,
    });

    if (result.ok && result.tank) {
      const defaultTasks = generateDefaultTasks(result.tank.id);
      const newTank = { ...result.tank, tasks: defaultTasks };

      const updatedTanks = [newTank, ...tanks];
      setTanks(updatedTanks);
      setSelectedTankId(newTank.id);
      setTasks([...tasks, ...defaultTasks]);

      console.log('[AppContext] Tank created in Supabase:', newTank.id);
      return newTank;
    }

    console.error('[AppContext] Failed to save tank to Supabase:', result.error);
    throw new Error(result.error || 'Failed to create tank');
  };

  const updateTank = async (tankId: string, updates: Partial<Tank>) => {
    if (!isAuthed || !authUser || !session) {
      console.error('[AppContext] Cannot update tank: user not authenticated');
      throw new Error('Authentication required to update tanks');
    }

    if (!isValidUUID(tankId)) {
      throw new Error('Invalid tank ID');
    }

    const supabaseUpdates: any = {};
    if (updates.name) supabaseUpdates.name = updates.name;
    if (updates.type) supabaseUpdates.tankType = updates.type;
    if (updates.sizeGallons) supabaseUpdates.sizeGallons = updates.sizeGallons;
    if (updates.waterType) supabaseUpdates.waterType = updates.waterType;

    if (Object.keys(supabaseUpdates).length > 0) {
      const result = await TankAdapter.updateTankData(tankId, supabaseUpdates);
      if (!result.ok) {
        console.error('[AppContext] Failed to update tank in Supabase:', result.error);
        throw new Error(result.error || 'Failed to update tank');
      }
    }

    // Only update local state after successful remote update
    setTanks(prev => prev.map(t => (t.id === tankId ? { ...t, ...updates } : t)));
    console.log('[AppContext] Tank updated in Supabase:', tankId);
  };

  const deleteTank = async (tankId: string) => {
    if (!isAuthed || !authUser || !session) {
      console.error('[AppContext] Cannot delete tank: user not authenticated');
      throw new Error('Authentication required to delete tanks');
    }

    if (!isValidUUID(tankId)) {
      throw new Error('Invalid tank ID');
    }

    const result = await TankAdapter.removeTank(tankId);
    if (!result.ok) {
      console.error('[AppContext] Failed to delete tank in Supabase:', result.error);
      throw new Error(result.error || 'Failed to delete tank');
    }

    // Only update local state after successful remote delete
    setTanks(prev => prev.filter(t => t.id !== tankId));
    setTasks(prev => prev.filter(t => t.tankId !== tankId));
    setSelectedTankId(prev => (prev === tankId ? null : prev));
    console.log('[AppContext] Tank deleted from Supabase:', tankId);
  };

  const addFishToTank = (tankId: string, fish: FishInstance) => {
    // DEPRECATED: Use addFishInstances() instead which requires auth and saves to Supabase
    console.warn('[AppContext] addFishToTank is deprecated - use addFishInstances for remote-only flow');
    
    if (!isAuthed || !session) {
      console.error('[AppContext] Cannot add fish: user not authenticated');
      throw new Error('Authentication required to add fish');
    }

    const normalizedFish = {
      ...fish,
      speciesId: normalizeSpeciesSlug(fish.speciesId) || fish.speciesId,
    };

    setTanks(prev =>
      prev.map(t => (t.id === tankId ? { ...t, fishInstances: [...t.fishInstances, normalizedFish] } : t))
    );
  };

  const addFishInstances = async (tankId: string, speciesId: string, quantity: number) => {
    const normalizedSlug = normalizeSpeciesSlug(speciesId) || speciesId;
    const now = new Date().toISOString();

    if (!isAuthed || !authUser || !session) throw new Error('Authentication required');
    if (!isValidUUID(tankId)) throw new Error('Invalid tank ID');

    const newInstances: FishInstance[] = [];

    for (let i = 0; i < quantity; i++) {
      const result = await TankAdapter.addFishToTank(tankId, normalizedSlug);

      if (result.ok && result.itemId) {
        newInstances.push({
          instanceId: result.itemId,
          speciesId: normalizedSlug,
          nickname: '',
          addedAt: now,
        });
      } else {
        throw new Error(result.error || 'Failed to add fish');
      }
    }

    setTanks(prev =>
      prev.map(t => (t.id === tankId ? { ...t, fishInstances: [...t.fishInstances, ...newInstances] } : t))
    );
  };

  const removeFishFromTank = async (tankId: string, instanceId: string) => {
    if (!isAuthed || !authUser || !session) {
      console.error('[AppContext] Cannot remove fish: user not authenticated');
      throw new Error('Authentication required to remove fish');
    }

    if (!isValidUUID(instanceId)) {
      throw new Error('Invalid fish instance ID');
    }

    const result = await TankAdapter.removeFishFromTank(instanceId);
    if (!result.ok) {
      console.error('[AppContext] Failed to remove fish from Supabase:', result.error);
      throw new Error(result.error || 'Failed to remove fish');
    }

    // Only update local state after successful remote delete
    setTanks(prev =>
      prev.map(t =>
        t.id === tankId
          ? { ...t, fishInstances: t.fishInstances.filter(f => f.instanceId !== instanceId) }
          : t
      )
    );
    console.log('[AppContext] Fish removed from Supabase:', instanceId);
  };

  const addWaterLog = (tankId: string, log: Omit<WaterLog, 'id'>) => {
    // LOCAL ONLY: For immediate UI feedback after remote save
    // All water logs must be saved via remoteWaterLogs.createWaterLog() when authenticated
    if (!isAuthed || !session) {
      console.error('[AppContext] Cannot add water log: user not authenticated');
      throw new Error('Authentication required to add water logs');
    }

    const newLog: WaterLog = { ...log, id: generateId() };
    setTanks(prev =>
      prev.map(t => (t.id === tankId ? { ...t, parametersLog: [newLog, ...t.parametersLog] } : t))
    );
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
    setTanks(prev =>
      prev.map(tank => ({
        ...tank,
        tasks: updatedTasks.filter(t => t.tankId === tank.id),
      }))
    );
  };

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    const updatedTasks = tasks.map(t => (t.id === taskId ? { ...t, ...updates } : t));
    setTasks(updatedTasks);
    setTanks(prev =>
      prev.map(tank => ({
        ...tank,
        tasks: updatedTasks.filter(t => t.tankId === tank.id),
      }))
    );
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        // hasCompletedOnboarding: REMOVED - use AuthContext.onboardingStatus
        profileLoading,
        isPremium,
        hasUsedFreeTrial,
        diseaseCheckCount,
        login,
        signup,
        logout,
        // completeOnboarding: REMOVED - use AuthContext.refreshProfile + RemoteProfiles.setOnboardingComplete
        updateUser,
        setPremium,
        useFreeTrial,
        incrementDiseaseCheck,
        tanks,
        selectedTankId,
        selectTank,
        createTank,
        updateTank,
        deleteTank,
        addFishToTank,
        addFishInstances,
        removeFishFromTank,
        addWaterLog,
        tasks,
        completeTask,
        updateTask,
        isLoading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useApp must be used within an AppProvider');
  return context;
}
