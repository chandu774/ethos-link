import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TranscriptSegment {
  start: number; // in seconds
  end: number;   // in seconds
  text: string;
}

// Attempt to fetch public YouTube timedtext captions
async function fetchYouTubeTimedText(videoId: string): Promise<TranscriptSegment[] | null> {
  try {
    const urls = [
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en-US`,
      `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&name=en`,
    ];

    for (const url of urls) {
      const res = await fetch(url);
      if (res.ok) {
        const xml = await res.text();
        if (xml && xml.includes("<text")) {
          const segments: TranscriptSegment[] = [];
          const regex = /<text start="([\d\.]+)" dur="([\d\.]+)"[^>]*>([\s\S]*?)<\/text>/g;
          let match;
          while ((match = regex.exec(xml)) !== null) {
            const start = Math.round(parseFloat(match[1]));
            const dur = Math.round(parseFloat(match[2]));
            let text = match[3]
              .replace(/&amp;/g, "&")
              .replace(/&lt;/g, "<")
              .replace(/&gt;/g, ">")
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'")
              .replace(/\n/g, " ")
              .trim();

            if (text) {
              segments.push({
                start,
                end: start + dur,
                text,
              });
            }
          }

          if (segments.length > 0) {
            return segments;
          }
        }
      }
    }
  } catch (err) {
    console.warn("[lecture-transcript] Could not fetch YouTube timed text directly:", err);
  }
  return null;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { lecture_id, youtube_video_id, title, topic, subject } = body;

    if (!lecture_id || !youtube_video_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: lecture_id, youtube_video_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    // 1. Try public YouTube timedtext first
    const timedSegments = await fetchYouTubeTimedText(youtube_video_id);

    let transcriptText = "";
    let transcriptSegments: TranscriptSegment[] = [];
    let summary = "";
    let keyConcepts: string[] = [];
    let source = "on_demand";

    if (timedSegments && timedSegments.length > 0) {
      transcriptSegments = timedSegments;
      transcriptText = timedSegments.map((s) => s.text).join(" ");
      source = "youtube_captions";

      // If Gemini is available, summarize and extract concepts from genuine transcript
      if (GEMINI_API_KEY) {
        try {
          const prompt = `Analyze this lecture transcript for "${title}" (${subject} - ${topic}):
Transcript snippet: "${transcriptText.slice(0, 3000)}"

Return JSON ONLY adhering to schema:
{
  "summary": "2-3 concise sentences summarizing key takeaways",
  "key_concepts": ["Concept 1", "Concept 2", "Concept 3", "Concept 4"]
}`;

          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
            }
          );

          if (geminiRes.ok) {
            const gData = await geminiRes.json();
            const textContent = gData.candidates?.[0]?.content?.parts?.[0]?.text || "";
            const jsonMatch = textContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              summary = parsed.summary || "";
              keyConcepts = Array.isArray(parsed.key_concepts) ? parsed.key_concepts : [];
            }
          }
        } catch (e) {
          console.warn("[lecture-transcript] Summary extraction failed:", e);
        }
      }

      if (!summary) {
        summary = `Comprehensive lecture coverage for ${title} covering core fundamentals of ${topic} in ${subject}.`;
      }
      if (keyConcepts.length === 0) {
        keyConcepts = [topic, subject, "Core Principles", "Practical Application"];
      }
    } else {
      // 2. Structured curriculum-grounded transcript generation using Gemini
      if (!GEMINI_API_KEY) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Transcript service configuration error: GEMINI_API_KEY is not configured.",
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const prompt = `You are an expert academic professor and transcription engine.
Generate an authentic, highly detailed, readable transcript breakdown with timestamps for a university lecture:
- Subject: ${subject || "Computer Science"}
- Topic: ${topic || "Database Management"}
- Lecture Title: "${title}"

REQUIREMENTS:
1. Provide 6 to 10 sequential transcript segments representing typical lecture progression (e.g. Introduction, Core Definitions, Detailed Walkthrough, Examples, Edge Cases, Summary).
2. For each segment, provide realistic start/end timestamps (in seconds, starting at 0) and substantive spoken lecture explanation text (at least 2-3 detailed sentences per segment).
3. Provide a concise 2-sentence summary.
4. Extract 4 to 6 accurate academic key concepts tested by this topic.

Return ONLY a valid JSON object matching this schema without markdown codeblocks:
{
  "summary": "Executive summary of the lecture...",
  "key_concepts": ["Concept 1", "Concept 2", "Concept 3", "Concept 4"],
  "segments": [
    {
      "start": 0,
      "end": 120,
      "text": "Welcome everyone to today's session on..."
    },
    {
      "start": 120,
      "end": 350,
      "text": "Let us begin by formalizing the core definition of..."
    }
  ]
}`;

      let geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );

      // Fallback model if 2.5-flash returns 404
      if (!geminiRes.ok && geminiRes.status === 404) {
        geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          }
        );
      }

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        console.error("[lecture-transcript] Gemini error:", geminiRes.status, errText);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to generate lecture transcript. Please try again." }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const gData = await geminiRes.json();
      const textContent = gData.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("AI returned unparseable transcript format");
      }

      const parsed = JSON.parse(jsonMatch[0]);
      summary = parsed.summary || `Lecture breakdown for ${title}`;
      keyConcepts = Array.isArray(parsed.key_concepts) ? parsed.key_concepts : [topic];
      transcriptSegments = Array.isArray(parsed.segments)
        ? parsed.segments.map((s: any) => ({
            start: Number(s.start) || 0,
            end: Number(s.end) || (Number(s.start) || 0) + 60,
            text: String(s.text || "").trim(),
          }))
        : [];

      transcriptText = transcriptSegments.map((s) => s.text).join("\n\n");
      source = "ai_structured";
    }

    return new Response(
      JSON.stringify({
        success: true,
        lecture_id,
        transcript_text: transcriptText,
        transcript_segments: transcriptSegments,
        summary,
        key_concepts: keyConcepts,
        source,
        language: "en",
        status: "READY",
        generated_at: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[lecture-transcript] Unexpected error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Failed to generate transcript" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
