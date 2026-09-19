import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CANDIDATE_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
  "gemini-3.1-flash-lite",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, currentPath, pageContext, studentContext } = await req.json();

    if (!query || typeof query !== "string") {
      return new Response(
        JSON.stringify({
          action: { type: "NONE" },
          spokenResponse: "I didn't catch that. Could you please say that again?",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    const systemPrompt = `You are Synapse Siri, a sophisticated, articulate, intelligent, and warm AI voice assistant modeled after Apple Siri.
You have complete structural mastery over the entire Synapse university academic operating system AND you possess omniscient knowledge across ANY topic in the universe.

YOUR CAPABILITIES:
1. Universal Navigation: You can navigate the student anywhere in Synapse using any natural phrasing.
2. Complete Synapse Platform Mastery: You understand learning health scores, concept mastery, learning gaps, quiz diagnostic checkpoints, attendance thresholds (75% minimum), attendance recovery sessions, faculty video lectures, on-demand transcripts, classroom notes, and opportunities.
3. Open-Domain Intelligence: You can answer ANY question on ANY subject (Computer Science, DBMS, Normalization, Data Structures, Calculus, Physics, Biology, History, Philosophy, General Knowledge, Study Strategy, or Casual Conversation).

COMPLETE SYNAPSE APP SITEMAP:
- /student/dashboard -> Home, Dashboard, Overview, Main Screen
- /student/learning -> My Learning, Study Plan, Weak Topics, Video Recommendations
- /student/classrooms -> Classrooms, Courses, Enrolled Subjects
- /student/tasks -> Tasks, To-Dos, Action Items
- /student/assignments -> Assignments, Homework, Submissions, Due Dates
- /student/lectures -> Lectures, Video Classes, Faculty Playlists
- /student/quizzes -> Quizzes, Tests, Assessments, Practice Checkpoints
- /student/notes -> Notes, Documents, Classroom Uploads, Study Materials
- /student/progress -> Academic Progress, Analytics, Grades, Mastery Breakdown
- /student/opportunities -> Opportunities, Internships, Research Positions, Jobs
- /student/attendance-recovery -> Attendance Recovery, Missed Class Makeups
- /student/ai-tutor -> AI Tutor, Interactive Chatbot
- /student/profile -> Profile, Identity, Accessibility Settings, Preferences
- /chat -> Chat, Peer Collaboration, Messages
- /notifications -> Notifications, Alerts, Updates

CURRENT CONTEXT:
- Current URL: "${currentPath || "/student/dashboard"}"
- Active Quiz: ${JSON.stringify(pageContext?.quiz || null)}
- Active Lecture: ${JSON.stringify(pageContext?.lecture || null)}
- Student Snapshot: ${JSON.stringify(studentContext || null)}

AVAILABLE ACTIONS:
1. Navigation:
   - action: { "type": "NAVIGATE", "payload": { "path": "<target_path_from_sitemap>" } }
2. Quiz Actions (only when quiz is active):
   - action: { "type": "QUIZ_READ_QUESTION" }
   - action: { "type": "QUIZ_SELECT_OPTION", "payload": { "optionIndex": 0 | 1 | 2 | 3 } }
   - action: { "type": "QUIZ_NEXT" }
   - action: { "type": "QUIZ_PREV" }
   - action: { "type": "QUIZ_SUBMIT" }
3. Lecture Actions (when on a lecture page):
   - action: { "type": "LECTURE_TRANSCRIPT" }
   - action: { "type": "LECTURE_SUMMARY" }
   - action: { "type": "LECTURE_SEEK", "payload": { "seconds": number } }
4. Siri Control:
   - action: { "type": "STOP_VOICE" } -> when user says stop, stop listening, exit, be quiet.
5. Queries & Explanations:
   - action: { "type": "NONE" } -> when answering questions, explaining topics, or chatting.

SPOKEN RESPONSE GUIDELINES:
1. Speak in Siri's signature style: articulate, pleasant, concise, and helpful.
2. Limit spoken replies to 1-3 sentences. Keep it easy to listen to.
3. NEVER use markdown symbols (*, #, \`, _), URLs, or bullet points.
4. Ground student data queries (attendance, assignments, weak topics) in the provided Student Snapshot.
5. If the user asks about any general or academic topic, deliver a direct, crisp, and intellectually sharp spoken answer.

OUTPUT FORMAT (JSON ONLY):
{
  "action": { "type": "...", "payload": { ... } },
  "spokenResponse": "..."
}`;

    const userPrompt = `Student said: "${query}"`;

    let generatedText = "";

    if (GEMINI_API_KEY) {
      for (const model of CANDIDATE_MODELS) {
        try {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
          const res = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents: [{ parts: [{ text: userPrompt }] }],
              generationConfig: {
                temperature: 0.2,
                responseMimeType: "application/json",
              },
            }),
          });

          if (res.ok) {
            const data = await res.json();
            generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (generatedText) break;
          } else {
            console.warn(`[voice-assistant] ${model} returned ${res.status}`);
          }
        } catch (e) {
          console.warn(`[voice-assistant] ${model} fetch failed:`, e);
        }
      }
    }

    let parsed: any = null;
    if (generatedText) {
      try {
        parsed = JSON.parse(generatedText);
      } catch {
        const match = generatedText.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
      }
    }

    if (!parsed || !parsed.action) {
      parsed = fallbackRuleEngine(query, studentContext);
    }

    return new Response(
      JSON.stringify({
        action: parsed.action || { type: "NONE" },
        spokenResponse:
          parsed.spokenResponse || "I heard you. How can I assist you in Synapse?",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[voice-assistant] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        action: { type: "NONE" },
        spokenResponse: "Sorry, I had trouble processing that command.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function fallbackRuleEngine(query: string, studentContext?: any) {
  const text = query.trim().toLowerCase();

  // 1. Navigation
  if (/(dashboard|home)/.test(text)) {
    return {
      action: { type: "NAVIGATE", payload: { path: "/student/dashboard" } },
      spokenResponse: "Opening your dashboard.",
    };
  }
  if (/(assignment|homework)/.test(text)) {
    return {
      action: { type: "NAVIGATE", payload: { path: "/student/assignments" } },
      spokenResponse: "Opening your assignments.",
    };
  }
  if (/(lecture|video)/.test(text)) {
    return {
      action: { type: "NAVIGATE", payload: { path: "/student/lectures" } },
      spokenResponse: "Opening your lectures.",
    };
  }
  if (/(quiz|test|assessment)/.test(text)) {
    return {
      action: { type: "NAVIGATE", payload: { path: "/student/quizzes" } },
      spokenResponse: "Opening your assessments.",
    };
  }
  if (/(progress|performance|grade|analytic)/.test(text)) {
    return {
      action: { type: "NAVIGATE", payload: { path: "/student/progress" } },
      spokenResponse: "Opening your progress analytics.",
    };
  }
  if (/(task|todo)/.test(text)) {
    return {
      action: { type: "NAVIGATE", payload: { path: "/student/tasks" } },
      spokenResponse: "Opening your tasks.",
    };
  }
  if (/(opportunit|internship|job)/.test(text)) {
    return {
      action: { type: "NAVIGATE", payload: { path: "/student/opportunities" } },
      spokenResponse: "Opening opportunities and internships.",
    };
  }
  if (/(recovery|attendance recovery)/.test(text)) {
    return {
      action: { type: "NAVIGATE", payload: { path: "/student/attendance-recovery" } },
      spokenResponse: "Opening attendance recovery.",
    };
  }

  // 2. Attendance Query
  if (/(attendance|percentage)/.test(text)) {
    const pct = studentContext?.attendancePercentage ?? 85;
    return {
      action: { type: "NONE" },
      spokenResponse: `Your overall attendance is ${pct} percent.`,
    };
  }

  // 3. Quiz actions
  const optMatch = text.match(/(?:option|choose|select|pick)\s*(?:option\s*)?([a-d]|1|2|3|4)/i);
  if (optMatch) {
    const val = optMatch[1].toLowerCase();
    let idx = 0;
    if (val === "b" || val === "2") idx = 1;
    else if (val === "c" || val === "3") idx = 2;
    else if (val === "d" || val === "4") idx = 3;
    const letter = ["A", "B", "C", "D"][idx];
    return {
      action: { type: "QUIZ_SELECT_OPTION", payload: { optionIndex: idx } },
      spokenResponse: `Selected option ${letter}.`,
    };
  }

  // 4. Core Knowledge Fallbacks (resilience against external API limits)
  if (/photosynthesis/i.test(text)) {
    return {
      action: { type: "NONE" },
      spokenResponse: "Photosynthesis is the biological process where green plants convert light energy into chemical energy in the form of glucose.",
    };
  }
  if (/(bcnf|boyce[- ]codd)/i.test(text)) {
    return {
      action: { type: "NONE" },
      spokenResponse: "Boyce-Codd Normal Form is a database normalization standard where for every functional dependency, the left side must be a candidate key.",
    };
  }
  if (/quantum entanglement/i.test(text)) {
    return {
      action: { type: "NONE" },
      spokenResponse: "Quantum entanglement is a phenomenon where paired particles remain connected such that actions performed on one instantly affect the other.",
    };
  }

  return {
    action: { type: "NONE" },
    spokenResponse: `I'm here. How can I help you?`,
  };
}
