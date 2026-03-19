import { useCallback, useState } from "react";
import { toast } from "sonner";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

type StudyTask = "summarize" | "explain" | "answer";

const TASK_PROMPTS: Record<StudyTask, string> = {
  summarize:
    "You are a study assistant. Summarize the notes clearly with bullet points and key takeaways.",
  explain:
    "You are a tutor. Explain the topic simply, with short examples and plain language.",
  answer:
    "You are a helpful TA. Provide a concise, accurate answer and a brief reasoning.",
};

interface RunStudyAIOptions {
  task: StudyTask;
  input: string;
  onChunk?: (text: string) => void;
}

export function useStudyAI() {
  const [isLoading, setIsLoading] = useState(false);

  const runStudyAI = useCallback(async ({ task, input, onChunk }: RunStudyAIOptions) => {
    if (!input.trim()) {
      toast.error("Please add some notes first.");
      return "";
    }

    setIsLoading(true);
    try {
      const messages = [
        { role: "system", content: TASK_PROMPTS[task] },
        { role: "user", content: input.trim() },
      ];

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        if (resp.status === 429) {
          toast.error("Rate limit exceeded. Please try again in a moment.");
        } else if (resp.status === 402) {
          toast.error("AI credits exhausted. Please add credits to continue.");
        } else {
          toast.error("Failed to get AI response.");
        }
        throw new Error(errorData.error || "AI request failed");
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantContent = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              onChunk?.(assistantContent);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              onChunk?.(assistantContent);
            }
          } catch {
            // ignore partial
          }
        }
      }

      return assistantContent;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { runStudyAI, isLoading };
}
