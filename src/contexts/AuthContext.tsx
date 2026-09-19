import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type UserRole = "administrator" | "faculty" | "student";

export type ExtendedProfile = Tables<"profiles"> & {
  role?: UserRole;
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
};

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
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Compute active role strictly from database profile or trusted app metadata
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
    const appRole = (user?.app_metadata as any)?.role;
    if (appRole === "administrator") return "administrator";
    if (appRole === "faculty") return "faculty";
    return "student";
  })();

  const role: UserRole = computedRole;
  const isAdmin = role === "administrator";
  const isFaculty = role === "faculty";
  const isStudent = role === "student";

  // Effective loading: true while initial check is running or while user is present but profile hasn't loaded yet
  const effectiveLoading = loading || (!profileLoaded && !!user);

  const fetchProfile = async (userId: string): Promise<ExtendedProfile | null> => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }
      return data as ExtendedProfile;
    } catch (err) {
      console.error("Profile query failed:", err);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
      setProfileLoaded(true);
    }
  };

  useEffect(() => {
    // Clear any legacy demo token
    localStorage.removeItem("synapse_demo_auth");

    let isMounted = true;

    // Safety timeout: ensure loading never hangs indefinitely
    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
        setProfileLoaded(true);
      }
    }, 4000);

    // Initial session check from Supabase Auth storage
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        try {
          const p = await fetchProfile(session.user.id);
          if (isMounted) setProfile(p);
        } catch (e) {
          console.error("Initial session profile load error:", e);
        } finally {
          if (isMounted) {
            setProfileLoaded(true);
            setLoading(false);
            clearTimeout(safetyTimer);
          }
        }
      } else {
        setProfile(null);
        setProfileLoaded(true);
        setLoading(false);
        clearTimeout(safetyTimer);
      }
    }).catch(() => {
      if (isMounted) {
        setProfileLoaded(true);
        setLoading(false);
        clearTimeout(safetyTimer);
      }
    });

    // Set up auth state listener for subsequent events (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        // Ignore INITIAL_SESSION because getSession() already handled it above
        if (event === "INITIAL_SESSION") return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Defer database query with setTimeout(..., 0) to avoid locking Supabase auth mutex
          setTimeout(async () => {
            if (!isMounted) return;
            try {
              const p = await fetchProfile(session.user.id);
              if (isMounted) setProfile(p);
            } catch (err) {
              console.error("Error loading profile on auth state change:", err);
            } finally {
              if (isMounted) {
                setProfileLoaded(true);
                setLoading(false);
                clearTimeout(safetyTimer);
              }
            }
          }, 0);
        } else {
          setProfile(null);
          setProfileLoaded(true);
          setLoading(false);
          clearTimeout(safetyTimer);
        }
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setProfileLoaded(false);
    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setLoading(false);
        setProfileLoaded(true);
        return { error: error as Error };
      }

      if (data?.user) {
        setUser(data.user);
        setSession(data.session);
        const p = await fetchProfile(data.user.id);
        setProfile(p);
      }
      return { error: null };
    } finally {
      setLoading(false);
      setProfileLoaded(true);
    }
  };

  // Student login using Roll Number + Password with deterministic internal mapping
  const loginWithRollNumber = async (rollNumber: string, password: string) => {
    return loginWithIdentifier(rollNumber, password);
  };

  // Unified Identifier-based login for all roles (Roll Number, Faculty ID, Admin ID, or Email)
  const loginWithIdentifier = async (identifier: string, password: string) => {
    const cleanId = identifier.trim();
    if (!cleanId) {
      return { error: new Error("Please enter your Login ID or Roll Number.") };
    }

    setLoading(true);
    setProfileLoaded(false);
    try {
      // 1. Resolve identifier to internal email via database RPC
      let targetEmail = cleanId;
      const { data: resolvedEmail, error: rpcError } = await (supabase.rpc as any)(
        "get_auth_email_for_login",
        { p_identifier: cleanId }
      );

      if (!rpcError && resolvedEmail) {
        targetEmail = resolvedEmail;
      } else if (!cleanId.includes("@")) {
        // Deterministic fallback for students if RPC returned null
        targetEmail = `${cleanId.toLowerCase()}@student.synapse.local`;
      }

      // 2. Authenticate with Supabase
      const { error: signInError, data } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password,
      });

      if (signInError) {
        setLoading(false);
        setProfileLoaded(true);
        return { error: signInError as Error };
      }

      // 3. Fetch profile immediately to compute active role
      let activeRole: UserRole = "student";
      if (data?.user) {
        setUser(data.user);
        setSession(data.session);
        const p = await fetchProfile(data.user.id);
        setProfile(p);
        if (p?.role === "administrator" || p?.is_admin) {
          activeRole = "administrator";
        } else if (p?.role === "faculty") {
          activeRole = "faculty";
        } else {
          activeRole = "student";
        }
      }

      return { error: null, role: activeRole };
    } catch (err: any) {
      return { error: err as Error };
    } finally {
      setLoading(false);
      setProfileLoaded(true);
    }
  };

  const completePasswordChange = async (newPassword: string) => {
    if (!user) return { error: new Error("No user logged in") };

    // 1. Update password in Supabase Auth
    const { error: authErr } = await supabase.auth.updateUser({ password: newPassword });
    if (authErr) return { error: authErr as Error };

    // 2. Mark must_change_password = false in public.profiles
    const { error: profErr } = await supabase
      .from("profiles")
      .update({ must_change_password: false, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (profErr) {
      console.error("Failed to update must_change_password:", profErr);
    }

    // Refresh profile in context
    await refreshProfile();
    return { error: null };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    localStorage.removeItem("synapse_demo_auth");
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    const baseUrl = window.location.origin;
    const redirectUrl = `${baseUrl}/auth`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });
    return { error: error as Error | null };
  };

  const resendVerification = async (email: string) => {
    const { error } = await supabase.auth.resend({ type: "signup", email });
    return { error: error as Error | null };
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
        loading: effectiveLoading,
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
