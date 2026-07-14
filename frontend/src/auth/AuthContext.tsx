import { Session } from "@supabase/supabase-js";
import { createContext, ReactNode, useContext, useEffect, useState, useCallback } from "react";
import { supabaseAuth } from "./supabaseClient";
import { api, ApiClientError } from "../api/client";

export type Role = "owner" | "staff";

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  whatsapp_number: string | null;
}

export type AuthBlockedReason = "pending_approval" | "rejected" | "revoked";

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  authBlockedReason: AuthBlockedReason | null;
  isPasswordRecovery: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authBlockedReason, setAuthBlockedReason] = useState<AuthBlockedReason | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const { profile } = await api.get<{ profile: Profile }>("/auth/me");
      setProfile(profile);
      setAuthBlockedReason(null);
    } catch (err) {
      setProfile(null);
      if (err instanceof ApiClientError && err.status === 403) {
        const reason = (err.details as { reason?: AuthBlockedReason } | undefined)?.reason;
        setAuthBlockedReason(reason === "rejected" || reason === "revoked" ? reason : "pending_approval");
      } else {
        setAuthBlockedReason(null);
      }
    }
  }, []);

  useEffect(() => {
    let active = true;

    supabaseAuth.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) await loadProfile();
      setLoading(false);
    });

    const { data: sub } = supabaseAuth.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      // A password-recovery link establishes a temporary session purely so the user can
      // set a new password — don't treat it as a normal sign-in (skip loading our app
      // profile / approval state) until they've actually done that.
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
        return;
      }
      if (newSession) {
        await loadProfile();
      } else {
        setProfile(null);
        setAuthBlockedReason(null);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabaseAuth.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const { error } = await supabaseAuth.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabaseAuth.auth.signOut();
    setAuthBlockedReason(null);
    setIsPasswordRecovery(false);
  }, []);

  const resetPasswordForEmail = useCallback(async (email: string) => {
    const { error } = await supabaseAuth.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(
    async (newPassword: string) => {
      const { error } = await supabaseAuth.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setIsPasswordRecovery(false);
      await loadProfile();
    },
    [loadProfile]
  );

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        authBlockedReason,
        isPasswordRecovery,
        signIn,
        signUp,
        signOut,
        refreshProfile: loadProfile,
        resetPasswordForEmail,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
