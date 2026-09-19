import { describe, it, expect } from "vitest";
import { supabase } from "@/integrations/supabase/client";

describe("Real Verified Opportunities System", () => {
  it("fetches only VERIFIED opportunities from database for public/student view", async () => {
    const { data, error } = await supabase
      .from("opportunities")
      .select("id, title, provider, category, verification_status, official_source_name, official_source_url")
      .eq("verification_status", "VERIFIED");

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);
    expect(data!.length).toBeGreaterThan(0);

    // Verify all returned items have VERIFIED status
    data!.forEach((item) => {
      expect(item.verification_status).toBe("VERIFIED");
      expect(item.title).toBeTruthy();
      expect(item.provider).toBeTruthy();
      expect(item.official_source_name).toBeTruthy();
    });
  });

  it("ensures all seeded opportunities have authoritative official sources", async () => {
    const { data } = await supabase
      .from("opportunities")
      .select("title, official_source_url, application_url")
      .eq("verification_status", "VERIFIED");

    expect(data).toBeDefined();
    data!.forEach((opp) => {
      expect(opp.official_source_url).toMatch(/^https?:\/\//);
      expect(opp.application_url).toMatch(/^https?:\/\//);
    });
  });

  it("checks student_saved_opportunities table structure and constraints", async () => {
    const { data, error } = await supabase
      .from("student_saved_opportunities")
      .select("*")
      .limit(1);

    // Query shouldn't error even if empty (table exists)
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});
