import { supabase } from "@/integrations/supabase/client";

export interface AccessibilityPreferences {
  id?: string;
  user_id: string;
  voice_assistance_enabled: boolean;
  transcript_assistance_enabled: boolean;
  captions_enabled: boolean;
  sign_language_enabled: boolean;
  text_to_speech_enabled: boolean;
  high_contrast: boolean;
  text_size: "normal" | "large" | "extra-large";
  reduced_motion: boolean;
  speech_rate: number;
}

export const DEFAULT_ACCESSIBILITY_PREFERENCES: Omit<AccessibilityPreferences, "user_id"> = {
  voice_assistance_enabled: false,
  transcript_assistance_enabled: false,
  captions_enabled: false,
  sign_language_enabled: false,
  text_to_speech_enabled: false,
  high_contrast: false,
  text_size: "normal",
  reduced_motion: false,
  speech_rate: 1.0,
};

export const accessibilityService = {
  async getPreferences(userId: string): Promise<AccessibilityPreferences> {
    if (!userId) {
      return { user_id: "", ...DEFAULT_ACCESSIBILITY_PREFERENCES };
    }

    try {
      const { data, error } = await supabase
        .from("accessibility_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.warn("Could not fetch accessibility preferences:", error.message);
        return { user_id: userId, ...DEFAULT_ACCESSIBILITY_PREFERENCES };
      }

      if (!data) {
        return { user_id: userId, ...DEFAULT_ACCESSIBILITY_PREFERENCES };
      }

      return {
        id: data.id,
        user_id: data.user_id,
        voice_assistance_enabled: data.voice_assistance_enabled ?? false,
        transcript_assistance_enabled: data.transcript_assistance_enabled ?? false,
        captions_enabled: data.captions_enabled ?? false,
        sign_language_enabled: data.sign_language_enabled ?? false,
        text_to_speech_enabled: data.text_to_speech_enabled ?? false,
        high_contrast: data.high_contrast ?? false,
        text_size: (data.text_size as any) || "normal",
        reduced_motion: data.reduced_motion ?? false,
        speech_rate: data.speech_rate ? Number(data.speech_rate) : 1.0,
      };
    } catch (err) {
      console.error("Failed to load accessibility preferences:", err);
      return { user_id: userId, ...DEFAULT_ACCESSIBILITY_PREFERENCES };
    }
  },

  async updatePreferences(
    userId: string,
    updates: Partial<Omit<AccessibilityPreferences, "id" | "user_id">>
  ): Promise<AccessibilityPreferences> {
    if (!userId) throw new Error("User ID is required to update accessibility preferences");

    const payload = {
      user_id: userId,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("accessibility_preferences")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .single();

    if (error) {
      console.error("Failed to update accessibility preferences:", error);
      throw error;
    }

    const merged: AccessibilityPreferences = {
      id: data.id,
      user_id: data.user_id,
      voice_assistance_enabled: data.voice_assistance_enabled ?? false,
      transcript_assistance_enabled: data.transcript_assistance_enabled ?? false,
      captions_enabled: data.captions_enabled ?? false,
      sign_language_enabled: data.sign_language_enabled ?? false,
      text_to_speech_enabled: data.text_to_speech_enabled ?? false,
      high_contrast: data.high_contrast ?? false,
      text_size: (data.text_size as any) || "normal",
      reduced_motion: data.reduced_motion ?? false,
      speech_rate: data.speech_rate ? Number(data.speech_rate) : 1.0,
    };

    this.applyDOMPreferences(merged);
    return merged;
  },

  applyDOMPreferences(prefs: AccessibilityPreferences) {
    if (typeof document === "undefined") return;

    const root = document.documentElement;

    // High contrast
    if (prefs.high_contrast) {
      root.classList.add("high-contrast");
    } else {
      root.classList.remove("high-contrast");
    }

    // Text sizing
    root.classList.remove("text-size-normal", "text-size-large", "text-size-xl");
    if (prefs.text_size === "large") {
      root.classList.add("text-size-large");
    } else if (prefs.text_size === "extra-large") {
      root.classList.add("text-size-xl");
    } else {
      root.classList.add("text-size-normal");
    }

    // Reduced motion
    if (prefs.reduced_motion) {
      root.classList.add("reduce-motion");
    } else {
      root.classList.remove("reduce-motion");
    }
  },
};
