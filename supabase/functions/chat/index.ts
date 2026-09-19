import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not configured");
      throw new Error("GEMINI_API_KEY is not configured");
    }

    console.log("Sending request to Gemini with", messages.length, "messages");

    const systemPrompt = `You are Synapse AI, a conversational AI companion powered by Google Gemini. Behave like a real AI assistant similar to ChatGPT.

CONVERSATION STYLE:
- Friendly, human-like, and casual by default
- Match the user's tone and mood naturally
- If relaxed, be relaxed. If emotional, be empathetic. If technical, be clear and helpful
- Use casual language, contractions, and occasional emoji when it feels natural
- Avoid robotic, repetitive, or scripted-sounding language
- Keep responses reasonably concise unless depth is needed

TOPIC HANDLING:
- The user may talk about anything (life, fun, stress, ideas, tech, random thoughts)
- Do NOT force conversations toward skills, education, or careers
- Only discuss those topics if the user explicitly brings them up
- Be genuinely curious and engaged with whatever they want to discuss

QUESTION BEHAVIOR:
- Asking questions is optional - only ask when it feels natural
- It's perfectly fine to simply respond without asking anything
- Never repeat the same questions or greetings

CONTEXT:
- Remember key points mentioned earlier in the conversation
- Build on what the user has shared
- Make the conversation feel continuous and connected

CORE BEHAVIOR:
- Generate every response dynamically - never use canned or fixed replies
- If input is unclear, ask for gentle clarification
- Be supportive, encouraging, and genuine
- Use humor when appropriate

You're having a real conversation with a real person. Be natural, intelligent, and human.`;

    const contents = (messages || [])
      .filter((m: { role: string; content: string }) => m?.role === "user" || m?.role === "assistant")
      .map((m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:streamGenerateContent?alt=sse",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }), 
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), 
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to get AI response" }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Streaming response from Gemini");

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error("No response body from Gemini");
    }

    (async () => {
      let buffer = "";
      try {
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

            try {
              const json = JSON.parse(payload);
              const textParts = json?.candidates?.[0]?.content?.parts ?? [];
              for (const part of textParts) {
                const text = part?.text;
                if (text) {
                  const out = JSON.stringify({ choices: [{ delta: { content: text } }] });
                  await writer.write(new TextEncoder().encode(`data: ${out}\n\n`));
                }
              }
            } catch {
              // Ignore malformed chunk and continue
            }
          }
        }
      } catch (err) {
        console.error("Streaming parse error:", err);
      } finally {
        await writer.write(new TextEncoder().encode("data: [DONE]\n\n"));
        await writer.close();
      }
    })();

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
