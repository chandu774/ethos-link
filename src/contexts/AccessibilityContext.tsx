import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  accessibilityService,
  AccessibilityPreferences,
  DEFAULT_ACCESSIBILITY_PREFERENCES,
} from "@/services/accessibilityService";
import { toast } from "sonner";

interface AccessibilityContextType {
  preferences: AccessibilityPreferences;
  loading: boolean;
  isVoiceEnabled: boolean;
  isTranscriptEnabled: boolean;
  updatePreferences: (
    updates: Partial<Omit<AccessibilityPreferences, "id" | "user_id">>
  ) => Promise<void>;
  reloadPreferences: () => Promise<void>;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<AccessibilityPreferences>({
    user_id: user?.id || "",
    ...DEFAULT_ACCESSIBILITY_PREFERENCES,
  });
  const [loading, setLoading] = useState(true);

  const fetchPrefs = useCallback(async () => {
    if (!user?.id) {
      setPreferences({
        user_id: "",
        ...DEFAULT_ACCESSIBILITY_PREFERENCES,
      });
      setLoading(false);
      return;
    }

    try {
      const prefs = await accessibilityService.getPreferences(user.id);
      setPreferences(prefs);
      accessibilityService.applyDOMPreferences(prefs);
    } catch (error) {
      console.error("Failed to load accessibility preferences:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchPrefs();
  }, [fetchPrefs]);

  const updatePreferences = async (
    updates: Partial<Omit<AccessibilityPreferences, "id" | "user_id">>
  ) => {
    if (!user?.id) return;
    try {
      const updated = await accessibilityService.updatePreferences(user.id, updates);
      setPreferences(updated);
      toast.success("Accessibility settings saved");
    } catch (err: any) {
      toast.error("Failed to save settings: " + (err.message || "Unknown error"));
      throw err;
    }
  };

  return (
    <AccessibilityContext.Provider
      value={{
        preferences,
        loading,
        isVoiceEnabled: preferences.voice_assistance_enabled,
        isTranscriptEnabled: preferences.transcript_assistance_enabled,
        updatePreferences,
        reloadPreferences: fetchPrefs,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

const defaultAccessibilityContext: AccessibilityContextType = {
  preferences: {
    user_id: "",
    ...DEFAULT_ACCESSIBILITY_PREFERENCES,
  },
  loading: false,
  isVoiceEnabled: false,
  isTranscriptEnabled: false,
  updatePreferences: async () => {},
  reloadPreferences: async () => {},
};

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    return defaultAccessibilityContext;
  }
  return context;
}
