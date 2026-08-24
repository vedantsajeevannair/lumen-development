import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
export interface User {
  id: string;
  email: string;
  role: string;
  fullName?: string;
  phoneNumber?: string;
  isActive: boolean;
  isVerified: boolean;
  verificationStatus: string;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  user: User;
}

export type Role =
  "CITIZEN" | "DEPARTMENT" | "SUPERVISOR" | "ENGINEER" | "ADMIN" | "SUPER_ADMIN" | "GUEST" | null;

interface AuthState {
  session: Session | null;
  user: User | null;
  role: Role;
  guestMode: boolean;
  isOnboardingComplete: boolean;
  isUnlocked: boolean;
  preferences: {
    theme: "light" | "dark" | "system";
    language: string;
  };
  userAvatars: Record<string, string>;
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setRole: (role: Role) => void;
  setUnlocked: (unlocked: boolean) => void;
  completeOnboarding: () => void;
  updatePreferences: (prefs: Partial<AuthState["preferences"]>) => void;
  setAvatarUri: (userId: string, uri: string | null) => void;
  loginAsGuest: () => void;
  logout: () => void;
  refreshTokens: (access_token: string, refresh_token: string, user: User) => void;
}

const memoryStorage: Record<string, string> = {};

const safeStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(name);
    } catch (e) {
      return memoryStorage[name] || null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(name, value);
    } catch (e) {
      memoryStorage[name] = value;
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(name);
    } catch (e) {
      delete memoryStorage[name];
    }
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      user: null,
      role: null,
      guestMode: false,
      isOnboardingComplete: false,
      isUnlocked: false,
      preferences: {
        theme: "system",
        language: "en",
      },
      userAvatars: {},
      setSession: (session) => set({ session, user: session?.user || null, isUnlocked: !!session }),
      setUser: (user) => set({ user, isUnlocked: !!user }),
      setRole: (role) => set({ role }),
      setUnlocked: (isUnlocked) => set({ isUnlocked }),
      completeOnboarding: () => set({ isOnboardingComplete: true }),
      updatePreferences: (prefs) =>
        set((state) => ({ preferences: { ...state.preferences, ...prefs } })),
      setAvatarUri: (userId, uri) =>
        set((state) => {
          const nextAvatars = { ...state.userAvatars };
          if (uri) {
            nextAvatars[userId] = uri;
          } else {
            delete nextAvatars[userId];
          }
          return { userAvatars: nextAvatars };
        }),
      loginAsGuest: () =>
        set({
          session: null,
          user: {
            id: "guest",
            email: "guest@lumen.city",
            role: "GUEST",
            isActive: true,
            isVerified: false,
            verificationStatus: "UNVERIFIED",
          },
          role: "GUEST",
          guestMode: true,
          isUnlocked: true,
        }),
      refreshTokens: (access_token, refresh_token, user) =>
        set((state) => ({
          session: { access_token, refresh_token, user },
          user: user,
          // Do NOT change isUnlocked here, to preserve lock screen security on background token refresh
        })),
      logout: () =>
        set({
          session: null,
          user: null,
          role: null,
          guestMode: false,
          isUnlocked: false,
        }),
    }),
    {
      name: "lumen-auth-storage",
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({
        session: state.session,
        user: state.user,
        role: state.role,
        isOnboardingComplete: state.isOnboardingComplete,
        preferences: state.preferences,
      }),
      merge: (persistedState: any, currentState) => ({
        ...currentState,
        ...persistedState,
        isUnlocked: false, // Force lock on app startup
      }),
    }
  )
);
