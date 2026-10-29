"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { AuthResponse, User } from "./api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  organizationId: string | null;
  role: string | null;
  isLoading: boolean;
  loginSession: (data: AuthResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  organizationId: null,
  role: null,
  isLoading: true,
  loginSession: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem("bytherix_token");
      const storedUser = localStorage.getItem("bytherix_user");
      const storedOrg = localStorage.getItem("bytherix_org");
      const storedRole = localStorage.getItem("bytherix_role");

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        setOrganizationId(storedOrg);
        setRole(storedRole);
      }
    } catch {
      // storage parsing error fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginSession = (data: AuthResponse) => {
    setToken(data.access_token);
    setUser(data.user);
    setOrganizationId(data.organization_id);
    setRole(data.role);

    localStorage.setItem("bytherix_token", data.access_token);
    localStorage.setItem("bytherix_user", JSON.stringify(data.user));
    localStorage.setItem("bytherix_org", data.organization_id);
    localStorage.setItem("bytherix_role", data.role);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setOrganizationId(null);
    setRole(null);

    localStorage.removeItem("bytherix_token");
    localStorage.removeItem("bytherix_user");
    localStorage.removeItem("bytherix_org");
    localStorage.removeItem("bytherix_role");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        organizationId,
        role,
        isLoading,
        loginSession,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
