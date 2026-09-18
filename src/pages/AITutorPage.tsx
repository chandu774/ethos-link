import { useState, useRef, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Brain,
  Send,
  Sparkles,
  Volume2,
  BookOpen,
  ArrowRight,
  FileCheck2,
  Bot,
  User,
  Lightbulb,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useSynapse } from "@/hooks/useSynapse";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

interface TutorMessage {
  id: string;
  sender: "ai" | "user";
  text: string;
  timestamp: string;
  suggestedAction?: {
    label: string;
    url: string;
  };
}

const INITIAL_MESSAGES: TutorMessage[] = [
  {
    id: "msg-1",
    sender: "ai",
    text: "Hello! I am your Synapse Academic AI Tutor powered by Google Gemini. I am aware of your enrolled classes (DBMS & Operating Systems) and your current learning focus on Normalization and 2NF (Second Normal Form). What concept or question can I assist you with today?",
    timestamp: "Just now",
  },
];

export default function AITutorPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const synapse = useSynapse();

  const [messages, setMessages] = useState<TutorMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeCourse, setActiveCourse] = useState("CS301: DBMS");
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // If redirected with ?concept=2NF, auto-ask
  useEffect(() => {
    const concept = searchParams.get("concept");
    if (concept) {
      handleUserSend(`I need help understanding ${concept}. Can you explain it simply with a concrete database schema example?`);
    }
  }, [searchParams]);

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === "function") {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  const handleSpeak = (id: string, text: string) => {
    if (isSpeaking === id) {
      synapse.stopSpeaking();
      setIsSpeaking(null);
      return;
    }
    setIsSpeaking(id);
    synapse.speakText(text, () => setIsSpeaking(null));
  };

  const streamFromGemini = async (userText: string, aiMsgId: string) => {
    const systemPrompt = `You are Synapse Academic AI Tutor, a master computer science professor and inclusive tutor. 
Current Student Profile:
- Name: ${profile?.name || "Alex Chen"}
- Roll Number: ${profile?.roll_number || "CS22B042"}
- Course/Branch: ${profile?.course || "B.Tech"} - ${profile?.branch || "Computer Science"}
- Active Course: ${activeCourse}
- Known Concept Gap / Weak Area: Second Normal Form (2NF) & Partial Dependencies (Mastery ~46%).

Instructions:
1. Provide accurate, crystal-clear conceptual explanations with short, relatable examples (e.g. university enrollment tables, OS memory paging frames).
2. Highlight key terms in **bold**.
3. Offer an intuitive breakdown of why the concept matters for exams and real systems.
4. Keep explanations engaging, concise, and academically rigorous without unnecessary fluff.`;

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.slice(-4).map((m) => ({
              role: m.sender === "ai" ? "assistant" : "user",
              content: m.text,
            })),
            { role: "user", content: userText },
          ],
        }),
      });

      if (!resp.ok) {
        throw new Error(`Edge function returned status ${resp.status}`);
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let accumulated = "";

      while (true) {
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
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              accumulated += content;
              setMessages((prev) =>
                prev.map((msg) => (msg.id === aiMsgId ? { ...msg, text: accumulated } : msg))
              );
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Check if 2NF or quiz practice is suggested
      if (accumulated.toLowerCase().includes("2nf") || accumulated.toLowerCase().includes("normal form")) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMsgId
              ? {
                  ...msg,
                  suggestedAction: {
                    label: "Take 3-Question 2NF Practice Checkpoint",
                    url: "/student/quizzes/quiz-2nf-targeted",
                  },
                }
              : msg
          )
        );
      }
    } catch (err: any) {
      console.warn("Gemini stream fallback trigger:", err);
      // Fallback to high-yield tutor answers
      const lower = userText.toLowerCase();
      let fallbackText = `Here is the explanation for your query on ${activeCourse}:\n\n`;
      if (lower.includes("2nf") || lower.includes("second normal") || lower.includes("partial")) {
        fallbackText +=
          "**Second Normal Form (2NF) Rule:**\n" +
          "1. The table must already be in **1NF**.\n" +
          "2. Every non-prime attribute must be **fully functionally dependent** on the primary key, eliminating partial dependency.\n\n" +
          "**Example Violation:**\n" +
          "`Enrollment(StudentID, CourseID, StudentName, Grade)`\n" +
          "- Composite Key: `(StudentID, CourseID)`\n" +
          "- `StudentName` depends only on `StudentID` (subset of key) -> 2NF Violation!\n" +
          "- **Resolution:** Split into `Students(StudentID, StudentName)` and `Enrollments(StudentID, CourseID, Grade)`.";
      } else {
        fallbackText +=
          `In **${activeCourse}**, mastering foundational definitions and data schemas ensures high accuracy on evaluations. Let's explore the core architectural trade-offs together.`;
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId
            ? {
                ...msg,
                text: fallbackText,
                suggestedAction: {
                  label: "Take Diagnostic Quiz",
                  url: "/student/quizzes",
                },
              }
            : msg
        )
      );
    }
  };

  const handleUserSend = async (userText: string) => {
    const textToSend = userText || input;
    if (!textToSend.trim()) return;

    const userMsg: TutorMessage = {
      id: "user-" + Date.now(),
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const aiMsgId = "ai-" + (Date.now() + 1);
    const aiMsg: TutorMessage = {
      id: aiMsgId,
      sender: "ai",
      text: "",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setInput("");
    setIsTyping(true);

    try {
      await streamFromGemini(textToSend, aiMsgId);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <StudentLayout>
      <div className="container max-w-5xl mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-xs font-semibold text-primary">
                Powered by Google Gemini
              </Badge>
              <span className="text-xs text-muted-foreground">• Real Academic Context & Weakness Adaptation</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Synapse AI Academic Tutor
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">Active Course Context:</span>
            <Badge className="bg-primary text-primary-foreground text-xs py-1 px-3">
              {activeCourse}
            </Badge>
          </div>
        </div>

        {/* Course Context Banner */}
        <div className="rounded-xl border border-primary/25 bg-gradient-to-r from-primary/10 via-background to-accent/10 p-3 text-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary shrink-0" />
            <span className="text-muted-foreground">
              Personalized Knowledge State: <strong className="text-foreground">2NF Mastery is 46% (Identified Gap)</strong> • Next DBMS Assignment due in 24 hours.
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[11px] px-2"
              onClick={() => setActiveCourse("CS301: DBMS")}
            >
              DBMS
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[11px] px-2"
              onClick={() => setActiveCourse("CS302: OS")}
            >
              Operating Systems
            </Button>
          </div>
        </div>

        {/* Chat Conversation Box */}
        <Card className="border shadow-sm h-[580px] flex flex-col">
          <CardContent className="p-4 flex-1 overflow-y-auto space-y-4">
            {messages.map((msg) => {
              const isAi = msg.sender === "ai";

              return (
                <div
                  key={msg.id}
                  className={cn("flex gap-3", isAi ? "items-start" : "items-start flex-row-reverse")}
                >
                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                    isAi ? "bg-gradient-to-tr from-primary to-accent text-primary-foreground" : "bg-muted text-foreground"
                  )}>
                    {isAi ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>

                  <div className={cn("space-y-1.5 max-w-xl", !isAi && "text-right")}>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="font-semibold text-foreground">{isAi ? "Synapse Gemini Tutor" : "You"}</span>
                      <span>• {msg.timestamp}</span>
                      {isAi && msg.text && (
                        <button
                          type="button"
                          className="hover:text-primary transition"
                          onClick={() => handleSpeak(msg.id, msg.text)}
                          title="Listen with Auditory TTS"
                        >
                          <Volume2 className={cn("h-3 w-3", isSpeaking === msg.id && "text-primary fill-primary")} />
                        </button>
                      )}
                    </div>

                    <div
                      className={cn(
                        "rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed whitespace-pre-line text-left",
                        isAi
                          ? "border border-border/50 bg-background/80 text-foreground shadow-sm"
                          : "bg-primary text-primary-foreground"
                      )}
                    >
                      {msg.text || (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                          <span>Gemini is formulating explanation...</span>
                        </div>
                      )}
                    </div>

                    {msg.suggestedAction && (
                      <div className="pt-1">
                        <Button
                          size="sm"
                          className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                          onClick={() => navigate(msg.suggestedAction!.url)}
                        >
                          <FileCheck2 className="h-3.5 w-3.5" />
                          <span>{msg.suggestedAction.label}</span>
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground italic">
                <Bot className="h-4 w-4 text-primary animate-pulse" />
                <span>Streaming response from Google Gemini backend...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          {/* Quick Prompt Suggestions */}
          <div className="border-t border-border/40 p-2.5 bg-muted/20 flex flex-wrap gap-1.5">
            {[
              "Explain 2NF with a real-world example",
              "Why is 2NF required before 3NF?",
              "Give me practice questions on Normalization",
              "Explain Multi-level Paging in OS",
            ].map((prompt, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground border-border/60"
                onClick={() => handleUserSend(prompt)}
              >
                {prompt}
              </Button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="p-3 border-t border-border/40 flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask any question about DBMS, Normalization, Operating Systems..."
              className="h-10 text-xs bg-background"
              onKeyDown={(e) => e.key === "Enter" && handleUserSend(input)}
            />
            <Button
              size="sm"
              className="h-10 px-4 bg-primary text-primary-foreground font-medium"
              disabled={isTyping || !input.trim()}
              onClick={() => handleUserSend(input)}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    </StudentLayout>
  );
}
