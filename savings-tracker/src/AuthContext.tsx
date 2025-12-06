import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { User } from './types';
import { fetchUsers } from './api';

// Use relative URL for production (HA ingress), absolute URL only for local dev
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || "./api";

interface AuthContextType {
  user: User | null;
  allUsers: User[];
  otherUsers: User[];
  login: (userId: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Compute other users (all users except current user)
  const otherUsers = useMemo(() => {
    if (!user) return allUsers;
    return allUsers.filter(u => u.id !== user.id);
  }, [user, allUsers]);

  useEffect(() => {
    // Load all users and check auth status
    const initialize = async () => {
      const users = await fetchUsers();
      setAllUsers(users);
      await checkAuthStatus();
    };
    initialize();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      if (sessionId) {
        const response = await fetch(`${API_BASE_URL}/me`, {
          headers: {
            'Authorization': sessionId,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          localStorage.removeItem('sessionId');
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('sessionId');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (userId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      localStorage.setItem('sessionId', data.sessionId);
      setUser(data.user);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const sessionId = localStorage.getItem('sessionId');
      if (sessionId) {
        await fetch(`${API_BASE_URL}/logout`, {
          method: 'POST',
          headers: {
            'Authorization': sessionId,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('sessionId');
      setUser(null);
    }
  };

  const value = {
    user,
    allUsers,
    otherUsers,
    login,
    logout,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
