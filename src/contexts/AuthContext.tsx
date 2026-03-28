import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import api from '@/lib/api';
import type { User, AdminPermissions, AuthState } from '@/types';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    permissions: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const loadPermissions = useCallback(async () => {
    try {
      const res = await api.get('/parish-admin/permissions');
      const permissions = res.data.data as AdminPermissions;
      localStorage.setItem('auth_permissions', JSON.stringify(permissions));
      return permissions;
    } catch {
      return null;
    }
  }, []);

  const initialize = useCallback(async () => {
    const token = localStorage.getItem('auth_token');
    const userStr = localStorage.getItem('auth_user');

    if (!token || !userStr) {
      setState(s => ({ ...s, isLoading: false }));
      return;
    }

    try {
      const res = await api.get('/auth/me');
      const user = res.data.data as User;
      const permissions = await loadPermissions();

      if (!permissions) {
        // User doesn't have parish admin role
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_permissions');
        setState(s => ({ ...s, isLoading: false }));
        return;
      }

      setState({
        user,
        token,
        permissions,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_permissions');
      setState(s => ({ ...s, isLoading: false }));
    }
  }, [loadPermissions]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', {
      email,
      password,
      device_name: 'paroquia-web',
    });

    const { user, token } = res.data.data;

    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));

    // Check if user has parish admin permissions
    const permissions = await loadPermissions();

    if (!permissions) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      throw new Error('Você não tem permissão para acessar este painel. Apenas sacerdotes e secretárias podem fazer login.');
    }

    setState({
      user,
      token,
      permissions,
      isAuthenticated: true,
      isLoading: false,
    });
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore logout errors
    }
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_permissions');
    setState({
      user: null,
      token: null,
      permissions: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  const hasPermission = (permission: string) => {
    if (!state.permissions) return false;
    if (state.permissions.parish_role === 'sacerdote') return true; // sacerdote has all
    return state.permissions.permissions.includes(permission);
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
