import { useState, useCallback } from "react";
import { API_URL, type UserProfile } from "../types";

export interface SignupPayload {
  full_name: string;
  email: string;
  password: string;
  selected_charity_id: string;
  charity_percentage: number;
}

export function useAuth() {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("dh_token"),
  );
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem("dh_user");
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      localStorage.setItem("dh_token", data.token);
      localStorage.setItem("dh_user", JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      return data.user as UserProfile;
    } catch (err: any) {
      setAuthError(err.message);
      throw err;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const signup = useCallback(async (values: SignupPayload) => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Signup failed");

      localStorage.setItem("dh_token", data.token);
      localStorage.setItem("dh_user", JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      return data.user as UserProfile;
    } catch (err: any) {
      setAuthError(err.message);
      throw err;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("dh_token");
    localStorage.removeItem("dh_user");
    setToken(null);
    setUser(null);
  }, []);

  return {
    user,
    token,
    authLoading,
    authError,
    setAuthError,
    login,
    signup,
    logout,
  };
}
