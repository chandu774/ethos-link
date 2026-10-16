import { useCallback, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/apiClient";

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

      const res = await api.post<any>("/ai/chat", { messages });
      const reply = res?.text || res?.reply || "Analysis complete.";
      onChunk?.(reply);
      return reply;
    } catch (err: any) {
      toast.error(err.message || "Failed to get AI response.");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { runStudyAI, isLoading };
}
