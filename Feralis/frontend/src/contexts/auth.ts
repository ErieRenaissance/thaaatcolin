import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, LoginCredentials, MFAVerification } from '@/types';
import apiClient from '@/api/client';

// ============================================================================
// AUTH STORE TYPES
// ============================================================================

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  requiresMFA: boolean;
  mfaToken: string | null;
  error: string | null;
}

interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<void>;
  verifyMFA: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

type AuthStore = AuthState & AuthActions;

// ============================================================================
// AUTH STORE
// ============================================================================

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: false,
      requiresMFA: false,
      mfaToken: null,
      error: null,

      // Actions
      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiClient.login(credentials);

          if (response.requiresMFA) {
            set({
              requiresMFA: true,
              mfaToken: response.mfaToken || null,
              isLoading: false,
            });
          } else {
            set({
              user: response.user,
              isAuthenticated: true,
              isLoading: false,
              requiresMFA: false,
              mfaToken: null,
            });
          }
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Login failed',
            isLoading: false,
          });
          throw error;
        }
      },

      verifyMFA: async (code: string) => {
        const { mfaToken } = get();
        if (!mfaToken) {
          throw new Error('No MFA token available');
        }

        set({ isLoading: true, error: null });

        try {
          const response = await apiClient.verifyMFA({ token: mfaToken, code });
          
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            requiresMFA: false,
            mfaToken: null,
          });
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'MFA verification failed',
            isLoading: false,
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          await apiClient.logout();
        } finally {
          set({
            user: null,
            isAuthenticated: false,
            requiresMFA: false,
            mfaToken: null,
            error: null,
          });
        }
      },

      refreshUser: async () => {
        try {
          const user = await apiClient.getCurrentUser();
          set({ user, isAuthenticated: true });
        } catch (error) {
          set({ user: null, isAuthenticated: false });
          throw error;
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// ============================================================================
// SELECTORS
// ============================================================================

export const selectUser = (state: AuthStore) => state.user;
export const selectIsAuthenticated = (state: AuthStore) => state.isAuthenticated;
export const selectIsLoading = (state: AuthStore) => state.isLoading;
export const selectRequiresMFA = (state: AuthStore) => state.requiresMFA;
export const selectError = (state: AuthStore) => state.error;

// ============================================================================
// PERMISSION HELPERS
// ============================================================================

export const usePermissions = () => {
  const user = useAuthStore(selectUser);

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    return user.permissions?.includes(permission) || false;
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some((permission) => hasPermission(permission));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every((permission) => hasPermission(permission));
  };

  const hasRole = (role: string): boolean => {
    return user?.role === role;
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
  };
};
