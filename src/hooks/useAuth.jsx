import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch the signed-in user's profile row. Wrapped to avoid deadlocks in
  // onAuthStateChange (which runs synchronously).
  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, display_name")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      // Trigger may not have fired yet on a brand-new session; profile will
      // appear on next tick. Don't throw — keep the user signed in.
      setProfile(null);
      return;
    }
    setProfile(data);
  }, []);

  useEffect(() => {
    // Get the existing session on first load.
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) loadProfile(s.user.id);
      setLoading(false);
    });

    // Subscribe to auth changes (login, logout, token refresh).
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      (async () => {
        setSession(s);
        if (s?.user) {
          await loadProfile(s.user.id);
        } else {
          setProfile(null);
        }
      })();
    });

    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const signUp = useCallback(async (email, password, displayName) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error };
    // Set the display name on the profile row if the session is active.
    const user = data.user;
    if (user && displayName) {
      await supabase
        .from("profiles")
        .update({ display_name: displayName })
        .eq("id", user.id);
    }
    return { error: null };
  }, []);

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) await loadProfile(session.user.id);
  }, [session, loadProfile]);

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
