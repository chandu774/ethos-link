import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      subject,
      topic,
      concepts,
      difficulty,
      questionCount,
      forbiddenKeywords,
      previousRejections,
    } = body;

    // Verify GEMINI_API_KEY from Supabase Edge Function environment (same secret used by AI Tutor)
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("[quiz-generate] Configuration error: GEMINI_API_KEY is not configured in Supabase Edge Function secrets.");
      return new Response(
        JSON.stringify({
          error: "AI service configuration error: Server environment variable GEMINI_API_KEY is missing from Supabase Edge Function secrets. Please configure GEMINI_API_KEY.",
          provider: "Google Gemini",
          configured: false,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Allow discovering supported models for this GEMINI_API_KEY
    if (body?.action === "list-models") {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`);
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!subject || !topic || !questionCount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: subject, topic, questionCount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hasExplicitConcepts = Array.isArray(concepts) && concepts.length > 0;
    const allowedConceptsList = hasExplicitConcepts
      ? concepts.join(", ")
      : `Core concepts of ${topic}`;

    const forbiddenList = (forbiddenKeywords && forbiddenKeywords.length > 0)
      ? forbiddenKeywords.join(", ")
      : "Unrelated concepts outside " + topic;

    let rejectionContext = "";
    if (previousRejections && previousRejections.length > 0) {
      rejectionContext = "\n\nCRITICAL: The following questions were rejected earlier. Do NOT repeat or duplicate them:\n" +
        previousRejections
          .map((r: { question: string; reason: string }, i: number) => `${i + 1}. "${r.question.slice(0, 80)}..." (Reason: ${r.reason})`)
          .join("\n");
    }

    const systemPrompt = `You are an expert university professor creating rigorous multiple-choice exam questions.
Output ONLY valid JSON adhering strictly to the schema.

STRICT ACADEMIC CONTEXT:
- Subject: ${subject}
- Topic: ${topic}
${hasExplicitConcepts ? `- Allowed Concepts: ${allowedConceptsList}` : `- Concepts: Topic-driven (${topic})`}
- Difficulty: ${difficulty}

MANDATORY RULES:
1. Every question MUST genuinely test the topic "${topic}"${hasExplicitConcepts ? ` and one of the allowed concepts: ${allowedConceptsList}` : ` and must be classified under an accurate core concept of ${topic}`}.
2. FORBIDDEN TOPICS (under NO circumstances include questions about these): ${forbiddenList}.
3. Exactly 4 unique options per question (Option A, B, C, D).
4. Exactly 1 option must be objectively correct.
5. 3 plausible same-domain distractors.
6. The correct answer must be one of the options.
7. Concept must be ${hasExplicitConcepts ? `one of: ${allowedConceptsList}` : `the precise core concept of '${topic}' being tested`}.
8. Return ONLY a valid JSON array of objects. Do NOT wrap in markdown code blocks or text.

SCHEMA:
[
  {
    "question": "Question stem here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_option_index": 0,
    "concept": "Exact Concept Name",
    "difficulty": "${difficulty}",
    "marks": 1,
    "explanation": "Concise explanation of why the correct option is right."
  }
]`;

    const userPrompt = `Generate exactly ${questionCount} ${difficulty}-level questions on Subject "${subject}", Topic "${topic}".
${hasExplicitConcepts ? `Allowed concepts to test: ${allowedConceptsList}.` : `Questions must cover key fundamental concepts of ${topic}.`}
Return ONLY the JSON array.${rejectionContext}`;

    // Modern models available on this Google Gemini API key
    const CANDIDATE_MODELS = [
      "gemini-2.5-flash-lite",
      "gemini-3.1-flash-lite-preview",
      "gemini-flash-latest",
      "gemini-2.5-flash",
    ];

    let accumulatedText = "";
    let lastErrorStatus = 0;
    let lastErrorMessage = "";
    let successfulModel = "";
    const modelAttempts: { model: string; status: number; error?: string }[] = [];

    // Try candidate models with fallback for quota/demand (429 / 503)
    for (const modelName of CANDIDATE_MODELS) {
      const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse`;
      console.log(`[quiz-generate] Attempting model: ${modelName}`);

      try {
        const geminiRes = await fetch(geminiEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": GEMINI_API_KEY,
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [
              {
                role: "user",
                parts: [{ text: userPrompt }],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.2,
            },
          }),
        });

        if (!geminiRes.ok) {
          lastErrorStatus = geminiRes.status;
          lastErrorMessage = await geminiRes.text();
          console.warn(`[quiz-generate] Model ${modelName} returned status ${lastErrorStatus}:`, lastErrorMessage.slice(0, 150));
          modelAttempts.push({ model: modelName, status: lastErrorStatus, error: lastErrorMessage.slice(0, 100) });
          continue;
        }

        const reader = geminiRes.body?.getReader();
        if (!reader) throw new Error("No response body from Gemini");

        const decoder = new TextDecoder();
        let buffer = "";
        let streamDone = false;
        let modelText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);

            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data:")) continue;

            const payload = line.slice(5).trim();
            if (!payload) continue;
            if (payload === "[DONE]") {
              streamDone = true;
              break;
            }

            try {
              const json = JSON.parse(payload);
              const candidate = json?.candidates?.[0];
              const textParts = candidate?.content?.parts ?? [];
              for (const part of textParts) {
                if (part?.text) {
                  modelText += part.text;
                }
              }
              if (candidate?.finishReason) {
                streamDone = true;
              }
            } catch {
              // ignore partial chunk json parse errors
            }
          }

          if (streamDone) {
            break;
          }
        }

        if (modelText.trim().length > 0) {
          accumulatedText = modelText;
          successfulModel = modelName;
          console.log(`[quiz-generate] Model ${modelName} succeeded. Length: ${accumulatedText.length}`);
          break;
        }
      } catch (err: any) {
        console.warn(`[quiz-generate] Model ${modelName} error:`, err.message);
        lastErrorMessage = err.message;
      }
    }

    if (!accumulatedText.trim()) {
      console.error("[quiz-generate] All candidate models failed. Last status:", lastErrorStatus);
      const isQuotaLimit = lastErrorStatus === 429;
      return new Response(
        JSON.stringify({
          error: isQuotaLimit
            ? "Google Gemini API rate limit / quota reached across models. Please wait 30 seconds before generating again."
            : `Google Gemini API error (${lastErrorStatus}): ${lastErrorMessage.slice(0, 200)}`,
          provider: "Google Gemini",
          status: lastErrorStatus,
          modelAttempts,
        }),
        { status: isQuotaLimit ? 429 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract JSON
    let parsedQuestions: any[] = [];
    try {
      let cleaned = accumulatedText.trim();
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();

      const startIdx = cleaned.indexOf("[");
      const endIdx = cleaned.lastIndexOf("]");
      if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
        throw new Error("No JSON array bracket found in output. Preview: " + cleaned.slice(0, 200));
      }

      cleaned = cleaned.slice(startIdx, endIdx + 1);
      parsedQuestions = JSON.parse(cleaned);

      if (!Array.isArray(parsedQuestions)) {
        throw new Error("Parsed JSON root is not an array");
      }
    } catch (parseErr: any) {
      console.error("[quiz-generate] JSON parse error:", parseErr.message, "raw preview:", accumulatedText.slice(0, 300));
      return new Response(
        JSON.stringify({
          error: "Failed to parse questions from Gemini response: " + parseErr.message,
          rawPreview: accumulatedText.slice(0, 200),
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[quiz-generate] Successfully generated ${parsedQuestions.length} questions`);

    return new Response(
      JSON.stringify({
        questions: parsedQuestions,
        provider: "Google Gemini",
        model: successfulModel || "gemini-2.5-flash",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[quiz-generate] Server error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
