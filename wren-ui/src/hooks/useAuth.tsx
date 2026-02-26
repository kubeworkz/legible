import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/router';
import { useMutation, useQuery } from '@apollo/client';
import { ME, LOGIN, SIGNUP, LOGOUT } from '@/apollo/client/graphql/auth';

const AUTH_TOKEN_KEY = 'wren-auth-token';

// ── localStorage helpers (exported for Apollo link) ─────────────

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

// ── Types ───────────────────────────────────────────────────────

export interface AuthUser {
  id: number;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
}

// ── Context ─────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Public auth pages that don't require authentication
const PUBLIC_PATHS = ['/login', '/signup'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  const token = getAuthToken();

  // Fetch current user on mount (if token exists)
  const { loading: meLoading, refetch: refetchMe } = useQuery(ME, {
    skip: !token,
    fetchPolicy: 'network-only',
    onCompleted: (data) => {
      if (data?.me) {
        setUser(data.me);
      } else {
        // Token is invalid / expired
        clearAuthToken();
        setUser(null);
      }
      setInitializing(false);
    },
    onError: () => {
      clearAuthToken();
      setUser(null);
      setInitializing(false);
    },
  });

  // If no token, skip loading immediately
  useEffect(() => {
    if (!token) {
      setInitializing(false);
    }
  }, [token]);

  const [loginMutation] = useMutation(LOGIN);
  const [signupMutation] = useMutation(SIGNUP);
  const [logoutMutation] = useMutation(LOGOUT);

  // Clear stale project/org IDs from a previous user's session
  const clearSessionState = useCallback(() => {
    localStorage.removeItem('wren-current-project-id');
    localStorage.removeItem('wren-current-org-id');
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      clearSessionState();
      const { data } = await loginMutation({
        variables: { data: { email, password } },
      });
      const { token: newToken, user: newUser } = data.login;
      setAuthToken(newToken);
      setUser(newUser);
    },
    [loginMutation, clearSessionState],
  );

  const signup = useCallback(
    async (email: string, password: string, displayName?: string) => {
      clearSessionState();
      const { data } = await signupMutation({
        variables: { data: { email, password, displayName } },
      });
      const { token: newToken, user: newUser } = data.signup;
      setAuthToken(newToken);
      setUser(newUser);
    },
    [signupMutation, clearSessionState],
  );

  const logout = useCallback(async () => {
    try {
      await logoutMutation();
    } catch {
      // ignore errors on logout
    }
    clearAuthToken();
    clearSessionState();
    setUser(null);
    router.push('/login');
  }, [logoutMutation, router, clearSessionState]);

  // Route protection: redirect unauthenticated users to /login
  const loading = initializing || meLoading;
  const isAuthenticated = !!user;

  useEffect(() => {
    if (loading) return;
    const isPublicPath = PUBLIC_PATHS.some((p) =>
      router.pathname.startsWith(p),
    );

    if (!isAuthenticated && !isPublicPath) {
      router.replace('/login');
    }

    if (isAuthenticated && isPublicPath) {
      router.replace('/');
    }
  }, [loading, isAuthenticated, router.pathname]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated,
      login,
      signup,
      logout,
    }),
    [user, loading, isAuthenticated, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
