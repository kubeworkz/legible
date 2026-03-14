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
  emailVerified: boolean;
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
const PUBLIC_PATHS = ['/login', '/signup', '/accept-invite', '/verify-email', '/magic-link'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Use state for token so it doesn't flicker on every render
  const [token, setToken] = useState<string | null>(() => getAuthToken());

  // Fetch current user on mount (if token exists)
  const { loading: meLoading } = useQuery(ME, {
    skip: !token,
    fetchPolicy: 'network-only',
    onCompleted: (data) => {
      if (data?.me) {
        setUser(data.me);
      } else {
        // Token is invalid / expired
        clearAuthToken();
        setToken(null);
        setUser(null);
      }
      setInitializing(false);
    },
    onError: () => {
      clearAuthToken();
      setToken(null);
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
      setToken(newToken);
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
      setToken(newToken);
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
    setToken(null);
    clearSessionState();
    setUser(null);
    // Only redirect to /login from non-public pages.
    // Public pages (e.g. /accept-invite) manage their own post-logout state.
    const isPublic = PUBLIC_PATHS.some((p) => router.pathname.startsWith(p));
    if (!isPublic) {
      router.push('/login');
    }
  }, [logoutMutation, router, clearSessionState]);

  // Route protection: redirect unauthenticated users to /login
  const loading = initializing || meLoading;
  const isAuthenticated = !!user;

  useEffect(() => {
    if (loading) return;
    const path = router.pathname;
    const isPublicPath = PUBLIC_PATHS.some((p) => path.startsWith(p));

    // 1. Unauthenticated on a protected page → go to login
    if (!isAuthenticated && !isPublicPath) {
      router.replace('/login');
      return;
    }

    // 2. Authenticated but email not verified → go to verify-email
    //    (skip if already on verify-email, accept-invite, or magic-link)
    if (
      isAuthenticated &&
      user &&
      !user.emailVerified &&
      !path.startsWith('/verify-email') &&
      !path.startsWith('/accept-invite') &&
      !path.startsWith('/magic-link')
    ) {
      router.replace('/verify-email');
      return;
    }

    // 3. Authenticated + verified on /login or /signup → go home
    //    (don't redirect from accept-invite, verify-email, or magic-link
    //     — those pages handle their own navigation after completing)
    if (
      isAuthenticated &&
      user?.emailVerified &&
      (path.startsWith('/login') || path.startsWith('/signup'))
    ) {
      router.replace('/');
      return;
    }
  }, [loading, isAuthenticated, router.pathname, user?.emailVerified]);

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
