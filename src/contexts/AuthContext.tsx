import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import api, { getAuthToken, setAuthToken } from "@/lib/apiClient";

export type UserRole = "administrator" | "faculty" | "student";

export interface User {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
}

export interface Session {
  access_token: string;
  user: User;
}

export interface ExtendedProfile {
  id: string;
  user_id?: string;
  full_name?: string;
  email?: string;
  avatar_url?: string;
  role?: UserRole;
  is_admin?: boolean;
  roll_number?: string;
  faculty_id?: string;
  department?: string;
  designation?: string;
  course?: string;
  branch?: string;
  year?: string;
  section?: string;
  must_change_password?: boolean;
  created_by_admin?: string;
  created_by_faculty?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: ExtendedProfile | null;
  role: UserRole;
  isAdmin: boolean;
  isFaculty: boolean;
  isStudent: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  loginWithRollNumber: (rollNumber: string, password: string) => Promise<{ error: Error | null }>;
  loginWithIdentifier: (identifier: string, password: string) => Promise<{ error: Error | null; role?: UserRole }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  completePasswordChange: (newPassword: string) => Promise<{ error: Error | null }>;
  resendVerification: (email: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ExtendedProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Compute active role strictly from user profile
  const computedRole: UserRole = (() => {
    if (profile?.role === "administrator" || profile?.is_admin) {
      return "administrator";
    }
    if (profile?.role === "faculty") {
      return "faculty";
    }
    if (profile?.role === "student") {
      return "student";
    }
    return "student";
  })();

  const role: UserRole = computedRole;
  const isAdmin = role === "administrator";
  const isFaculty = role === "faculty";
  const isStudent = role === "student";

  const fetchProfile = async (): Promise<ExtendedProfile | null> => {
    try {
      const data = await api.get<{ user: any; profile: any }>("/auth/me");
      if (data && data.profile) {
        return data.profile as ExtendedProfile;
      }
      return null;
    } catch (err) {
      console.error("Profile query failed:", err);
      return null;
    }
  };

  const refreshProfile = async () => {
    const token = getAuthToken();
    if (token) {
      const profileData = await fetchProfile();
      if (profileData) {
        setProfile(profileData);
        setUser({
          id: profileData.id,
          email: profileData.email,
          user_metadata: { full_name: profileData.full_name },
          app_metadata: { role: profileData.role },
        });
      }
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      const token = getAuthToken();
      if (!token) {
        if (isMounted) {
          setUser(null);
          setSession(null);
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      try {
        const data = await api.get<{ user: any; profile: any }>("/auth/me");
        if (isMounted && data && data.user) {
          setUser({
            id: data.user.id,
            email: data.user.email,
            user_metadata: { full_name: data.profile?.full_name },
            app_metadata: { role: data.user.role },
          });
          setSession({
            access_token: token,
            user: {
              id: data.user.id,
              email: data.user.email,
            },
          });
          setProfile(data.profile);
        }
      } catch (err) {
        console.warn("Session restore failed, clearing token:", err);
        setAuthToken(null);
        if (isMounted) {
          setUser(null);
          setSession(null);
          setProfile(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.post<{ token: string; user: any; profile: any }>("/auth/login", {
        email: email.trim(),
        password,
      });

      setAuthToken(res.token);
      setUser({
        id: res.user.id,
        email: res.user.email,
        user_metadata: { full_name: res.profile?.full_name },
        app_metadata: { role: res.user.role },
      });
      setSession({
        access_token: res.token,
        user: { id: res.user.id, email: res.user.email },
      });
      setProfile(res.profile);

      return { error: null };
    } catch (error: any) {
      return { error: new Error(error.message || "Failed to sign in") };
    } finally {
      setLoading(false);
    }
  };

  const loginWithRollNumber = async (rollNumber: string, password: string) => {
    return loginWithIdentifier(rollNumber, password);
  };

  const loginWithIdentifier = async (identifier: string, password: string) => {
    const cleanId = identifier.trim();
    if (!cleanId) {
      return { error: new Error("Please enter your Login ID or Roll Number.") };
    }

    setLoading(true);
    try {
      const res = await api.post<{ token: string; user: any; profile: any }>("/auth/login-identifier", {
        identifier: cleanId,
        password,
      });

      setAuthToken(res.token);
      setUser({
        id: res.user.id,
        email: res.user.email,
        user_metadata: { full_name: res.profile?.full_name },
        app_metadata: { role: res.user.role },
      });
      setSession({
        access_token: res.token,
        user: { id: res.user.id, email: res.user.email },
      });
      setProfile(res.profile);

      const activeRole: UserRole = res.user.role || (res.profile?.role as UserRole) || "student";
      return { error: null, role: activeRole };
    } catch (err: any) {
      return { error: new Error(err.message || "Login failed") };
    } finally {
      setLoading(false);
    }
  };

  const completePasswordChange = async (newPassword: string) => {
    if (!user) return { error: new Error("No user logged in") };

    try {
      await api.post("/auth/change-password", { newPassword });
      await refreshProfile();
      return { error: null };
    } catch (err: any) {
      return { error: new Error(err.message || "Failed to change password") };
    }
  };

  const updatePassword = async (newPassword: string) => {
    return completePasswordChange(newPassword);
  };

  const signOut = async () => {
    setAuthToken(null);
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    try {
      await api.post("/auth/forgot-password", { email });
      return { error: null };
    } catch (err: any) {
      return { error: new Error(err.message || "Password reset request failed") };
    }
  };

  const resendVerification = async (_email: string) => {
    return { error: null };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        isAdmin,
        isFaculty,
        isStudent,
        loading,
        signIn,
        loginWithRollNumber,
        loginWithIdentifier,
        signOut,
        resetPassword,
        updatePassword,
        completePasswordChange,
        resendVerification,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
