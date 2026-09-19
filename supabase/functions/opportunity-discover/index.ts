import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Official Source Registry
const OFFICIAL_SOURCES = [
  {
    name: "National Scholarship Portal (NSP)",
    url: "https://scholarships.gov.in",
    sampleNotice: `Ministry of Minority Affairs / Ministry of Social Justice & Empowerment: Post-Matric Scholarship Scheme for 2026-2027. Open for students enrolled in Class 11, 12, ITI, B.Tech, Degree, and Postgraduate courses. Annual family income must not exceed Rs 2.5 Lakh. Minimum percentage required is 50% in previous exam. Applications open from 2026-08-01 until 2026-11-30. Award includes admission fee, tuition fee, and maintenance allowance up to Rs 10,000/year. Required documents: income certificate, marksheet, domicile certificate, Aadhaar card.`,
  },
  {
    name: "AICTE Swanath Scholarship Scheme",
    url: "https://www.aicte-india.org/schemes/students-development-schemes/Swanath",
    sampleNotice: `AICTE Swanath Scholarship Scheme for Orphans, Either or Both Parents deceased due to Covid-19, and Wards of Armed Forces / Central Paramilitary Forces martyred in action. Eligibility: Studying in AICTE approved institutions in Degree or Diploma programs. Family income limit not more than Rs 8 Lakh per annum. Financial assistance of Rs 50,000 per annum for tuition and living. Deadline: 2026-10-31. Documents: Death certificate of parents / martyr certificate, bonafide certificate, marksheet, income proof.`,
  },
  {
    name: "DRDO Scholarship Scheme for Girls",
    url: "https://www.drdo.gov.in",
    sampleNotice: `Defence Research and Development Organisation (DRDO) - RAC invites applications from meritorious girl students pursuing first year undergraduate (B.Tech/BE) or postgraduate (M.Tech/ME) degrees in Computer Science, Aeronautical, Electrical, Electronics, or Mechanical Engineering. Undergraduates receive Rs 1,20,000 per year for up to 4 years. Based on valid JEE Main rank. Minimum 60% marks in 12th standard. Deadline: 2026-11-15. Application on rac.gov.in.`,
  }
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY is missing from edge function environment" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const customText = body.noticeText;
    const customSourceUrl = body.sourceUrl;
    const customSourceName = body.sourceName;

    const sourcesToProcess = customText
      ? [{ name: customSourceName || "Official Government Bulletin", url: customSourceUrl || "https://scholarships.gov.in", sampleNotice: customText }]
      : OFFICIAL_SOURCES;

    const discoveredItems: any[] = [];

    for (const source of sourcesToProcess) {
      console.log(`[opportunity-discover] Extracting from official source: ${source.name}`);

      const systemPrompt = `You are an expert government opportunity ingestion parser.
Your job is to read real, official circulars/notices and extract structured eligibility and scholarship data without hallucination or exaggeration.
Never fabricate data. If a field is not stated in the source, set it to null or an empty array.
All newly discovered opportunities MUST be flagged for review. Output ONLY valid JSON adhering to the schema.`;

      const userPrompt = `Extract structured opportunity data from this official notice:
Source Name: ${source.name}
Source URL: ${source.url}
Notice Text:
"""
${source.sampleNotice}
"""

Return a JSON object with this exact structure:
{
  "title": "Exact Title of Scheme",
  "provider": "Official Ministry / Department Name",
  "category": "Scholarships" | "Fellowships" | "Internships" | "Competitions",
  "description": "2-3 sentence factual summary of scheme and intent.",
  "official_source_name": "${source.name}",
  "official_source_url": "${source.url}",
  "application_url": "${source.url}",
  "eligibility_text": "Precise summary of who can apply as per notice.",
  "course_level": "Undergraduate" | "Postgraduate" | "PhD" | "All",
  "eligible_courses": ["B.Tech", "BE", ...],
  "eligible_branches": ["Computer Science", ...],
  "eligible_years": ["1st Year", ...],
  "minimum_percentage": 50.0 or null,
  "income_limit": 250000 or null,
  "gender_criteria": "ALL" | "FEMALE" | "MALE",
  "category_criteria": "ALL" | "SC" | "ST" | "OBC" | "MINORITY",
  "disability_criteria": "NONE" | "PWD_ONLY" | "ALL",
  "state_criteria": "ALL_INDIA" | "Specific State",
  "age_criteria": "Under 25 years" or null,
  "opening_date": "YYYY-MM-DD" or null,
  "deadline": "YYYY-MM-DD" or null,
  "award_amount": "Exact amount as stated",
  "required_documents": ["Document 1", "Document 2"]
}`;

      const CANDIDATE_MODELS = ["gemini-2.5-flash-lite", "gemini-3.1-flash-lite-preview", "gemini-flash-latest"];
      let extractedText = "";

      for (const model of CANDIDATE_MODELS) {
        try {
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": GEMINI_API_KEY,
              },
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: [{ role: "user", parts: [{ text: userPrompt }] }],
                generationConfig: {
                  responseMimeType: "application/json",
                  temperature: 0.1,
                },
              }),
            }
          );

          if (!geminiRes.ok) {
            console.warn(`[opportunity-discover] Model ${model} failed:`, await geminiRes.text());
            continue;
          }

          const geminiData = await geminiRes.json();
          extractedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (extractedText) {
            console.log(`[opportunity-discover] Model ${model} extracted ${extractedText.length} chars`);
            break;
          }
        } catch (e: any) {
          console.warn(`[opportunity-discover] Model ${model} fetch exception:`, e.message);
        }
      }

      if (!extractedText) continue;

      try {
        const parsed = JSON.parse(extractedText);
        
        // Prepare database row
        const rowData = {
          title: parsed.title,
          organization: parsed.provider,
          provider: parsed.provider,
          type: parsed.category || "Scholarships",
          category: parsed.category || "Scholarships",
          description: parsed.description,
          official_source_name: parsed.official_source_name || source.name,
          official_source_url: parsed.official_source_url || source.url,
          application_url: parsed.application_url || source.url,
          apply_url: parsed.application_url || source.url,
          eligibility_text: parsed.eligibility_text,
          course_level: parsed.course_level || "Undergraduate",
          eligible_courses: parsed.eligible_courses || [],
          eligible_branches: parsed.eligible_branches || [],
          eligible_years: parsed.eligible_years || [],
          minimum_percentage: parsed.minimum_percentage || null,
          income_limit: parsed.income_limit || null,
          gender_criteria: parsed.gender_criteria || "ALL",
          category_criteria: parsed.category_criteria || "ALL",
          disability_criteria: parsed.disability_criteria || "NONE",
          state_criteria: parsed.state_criteria || "ALL_INDIA",
          age_criteria: parsed.age_criteria || null,
          opening_date: parsed.opening_date || null,
          deadline: parsed.deadline || null,
          award_amount: parsed.award_amount,
          amount_or_stipend: parsed.award_amount,
          required_documents: parsed.required_documents || [],
          status: "OPEN",
          verification_status: "PENDING_REVIEW", // Mandatory review before student visibility
          verification_notes: `Discovered from official bulletin: ${source.name}. Awaiting faculty/admin verification.`,
          updated_at: new Date().toISOString(),
        };

        // Check if already exists by title
        const { data: existing } = await supabase
          .from("opportunities")
          .select("id, verification_status")
          .eq("title", rowData.title)
          .maybeSingle();

        if (existing) {
          console.log(`[opportunity-discover] Scheme already exists: ${rowData.title} (Status: ${existing.verification_status})`);
          discoveredItems.push({ ...rowData, id: existing.id, isExisting: true });
        } else {
          const { data: inserted, error: insertErr } = await supabase
            .from("opportunities")
            .insert(rowData)
            .select()
            .single();

          if (insertErr) {
            console.error(`[opportunity-discover] DB insert failed:`, insertErr);
          } else {
            console.log(`[opportunity-discover] Inserted new pending opportunity: ${rowData.title}`);
            discoveredItems.push({ ...inserted, isNew: true });
          }
        }
      } catch (parseErr: any) {
        console.error(`[opportunity-discover] JSON parse error:`, parseErr.message);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: discoveredItems.length,
        items: discoveredItems,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[opportunity-discover] Handler error:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
