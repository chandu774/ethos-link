import { useState, useRef, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Send,
  ArrowRight,
  FileCheck2,
  Bot,
  User,
  Lightbulb,
  Loader2,
  BookOpen,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  buildStudentLearningProfile,
  generateTutorRecommendations,
  getKnowledgeStateSummary,
} from "@/services/studentLearningProfileService";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

interface TutorMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  suggestedAction?: {
    label: string;
    url: string;
  };
}

export default function AITutorPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  // Load deterministic learning profile for the authenticated student
  const { data: learningProfile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["student-learning-profile", user?.id],
    queryFn: () => buildStudentLearningProfile(user!.id),
    enabled: !!user?.id,
    staleTime: 60 * 1000,
  });

  const studentFirstName = profile?.name ? profile.name.split(" ")[0] : "there";

  const [messages, setMessages] = useState<TutorMessage[]>(() => [
    {
      id: "m1",
      sender: "ai",
      text: `Hello ${studentFirstName}! I'm your Synapse Academic AI Tutor powered by Gemini. I have full context on your enrolled courses, syllabus benchmarks, and genuine quiz performance. What concept or problem can we explore together today?`,
      timestamp: "Just now",
    },
  ]);

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string>("All Courses");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-select single course if student is only enrolled in one
  useEffect(() => {
    if (learningProfile?.courses && learningProfile.courses.length === 1 && selectedCourse === "All Courses") {
      setSelectedCourse(learningProfile.courses[0].name);
    }
  }, [learningProfile, selectedCourse]);

  // If redirected with ?concept=XYZ, auto-ask
  useEffect(() => {
    const concept = searchParams.get("concept");
    if (concept) {
      handleUserSend(`I need help understanding ${concept}. Can you explain it simply with a concrete syllabus example?`);
    }
  }, [searchParams]);

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === "function") {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  // Dynamic knowledge state summary
  const knowledgeSummary = useMemo(() => {
    if (!learningProfile) {
      return {
        title: "Learning Insight",
        detail: "Loading academic profile and performance records...",
        hasData: false,
      };
    }
    return getKnowledgeStateSummary(learningProfile, selectedCourse);
  }, [learningProfile, selectedCourse]);

  // Dynamic recommended prompts generated deterministically from real data
  const recommendedPrompts = useMemo(() => {
    if (!learningProfile) {
      return [
        "Ask me to explain any concept from your courses",
        "Create a study plan for today",
        "Help me understand my upcoming coursework",
        "Give me diagnostic practice questions",
      ];
    }
    return generateTutorRecommendations(learningProfile, selectedCourse);
  }, [learningProfile, selectedCourse]);

  const streamFromGemini = async (userText: string, aiMsgId: string) => {
    const studentName = profile?.name || "Student";
    const studentRoll = profile?.roll_number || "N/A";
    const enrolledCoursesStr =
      learningProfile?.courses && learningProfile.courses.length > 0
        ? learningProfile.courses.map((c) => `${c.name}${c.code ? ` (${c.code})` : ""}`).join(", ")
        : "General Academic Curriculum";

    const weakAreasStr =
      learningProfile?.weakAreas && learningProfile.weakAreas.length > 0
        ? learningProfile.weakAreas
            .slice(0, 3)
            .map((w) => `- ${w.concept || w.topic} (${w.subject}): ${w.accuracy}% accuracy (${w.correctCount}/${w.totalQuestions} correct)`)
            .join("\n")
        : "No identified learning gaps yet (good progress or building profile).";

    const strongAreasStr =
      learningProfile?.strongAreas && learningProfile.strongAreas.length > 0
        ? learningProfile.strongAreas
            .slice(0, 3)
            .map((s) => `- ${s.concept || s.topic} (${s.subject}): ${s.accuracy}% accuracy`)
            .join("\n")
        : "Standard baseline.";

    const upcomingAsgStr =
      learningProfile?.upcomingAssignments && learningProfile.upcomingAssignments.length > 0
        ? learningProfile.upcomingAssignments
            .slice(0, 2)
            .map((a) => `- "${a.title}" (${a.subject})${a.topic ? ` on ${a.topic}` : ""}, due in ${a.daysRemaining} days`)
            .join("\n")
        : "No urgent upcoming assignments.";

    const coursePerfStr =
      learningProfile?.performanceByCourse && learningProfile.performanceByCourse.length > 0
        ? learningProfile.performanceByCourse
            .filter((p) => p.quizAverage !== null)
            .map((p) => `- ${p.courseName}: ${p.quizAverage}% quiz avg across ${p.quizAttemptsCount} attempts`)
            .join("\n")
        : "Quiz performance history is being established.";

    const systemPrompt = `You are Synapse Academic AI Tutor, a master computer science professor and personalized academic mentor.
Current Student Profile (Authentic Synapse Record):
- Name: ${studentName}
- Roll Number: ${studentRoll}
- Enrolled Courses: ${enrolledCoursesStr}
- Active Focus Context: ${selectedCourse}

Academic Performance & Learning Signals:
- Known Learning Gaps / Areas Needing Review:
${weakAreasStr}
- Mastered Concepts & Strong Areas:
${strongAreasStr}
- Upcoming Coursework Deadlines:
${upcomingAsgStr}
- Course Performance Baselines:
${coursePerfStr}

Pedagogical Instructions:
1. Provide accurate, crystal-clear conceptual explanations with short, relatable examples tailored to ${selectedCourse !== "All Courses" ? selectedCourse : "their courses"}.
2. Highlight key terms in **bold**.
3. Offer an intuitive breakdown of why the concept matters for exams and real systems.
4. Keep explanations engaging, concise, and academically rigorous without unnecessary fluff.
5. If the student asks about a concept related to their identified weak areas, give extra clarity and reinforce foundational principles.`;

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

      // Check if any weak area concept was discussed, offer targeted quiz practice
      const discussedWeak = learningProfile?.weakAreas.find((w) => {
        const name = (w.concept || w.topic).toLowerCase();
        return accumulated.toLowerCase().includes(name);
      });

      if (discussedWeak) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMsgId
              ? {
                  ...msg,
                  suggestedAction: {
                    label: `Practice ${discussedWeak.concept || discussedWeak.topic} Checkpoint`,
                    url: "/student/quizzes",
                  },
                }
              : msg
          )
        );
      }
    } catch (err: any) {
      console.warn("Gemini stream fallback trigger:", err);
      const courseFocus = selectedCourse !== "All Courses" ? selectedCourse : "your enrolled coursework";
      const fallbackText =
        `Here is a foundational breakdown for your query on **${courseFocus}**:\n\n` +
        `When mastering this topic, focus on the core formal definition, evaluate typical constraints, and trace real application examples.\n\n` +
        `Ask follow-up questions to break this down further or test yourself with targeted practice!`;

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId
            ? {
                ...msg,
                text: fallbackText,
                suggestedAction: {
                  label: "Practice Classroom Quizzes",
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

  const placeholderText = useMemo(() => {
    if (selectedCourse && selectedCourse !== "All Courses") {
      return `Ask any question about ${selectedCourse}...`;
    }
    if (learningProfile?.courses && learningProfile.courses.length > 0) {
      const topCourses = learningProfile.courses.slice(0, 2).map((c) => c.name).join(", ");
      return `Ask any question about ${topCourses}...`;
    }
    return "Ask any academic question or concept...";
  }, [selectedCourse, learningProfile]);

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
              <span className="text-xs text-muted-foreground">• Real Academic Context & Adaptive Guidance</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Synapse AI Academic Tutor
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">Active Course Context:</span>
            {learningProfile?.courses && learningProfile.courses.length > 1 ? (
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger className="h-8 text-xs min-w-[160px] bg-background">
                  <SelectValue placeholder="All Courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Courses">All Courses</SelectItem>
                  {learningProfile.courses.map((c) => (
                    <SelectItem key={c.id || c.name} value={c.name}>
                      {c.name} {c.code ? `(${c.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge className="bg-primary text-primary-foreground text-xs py-1 px-3">
                {selectedCourse}
              </Badge>
            )}
          </div>
        </div>

        {/* Personalized Knowledge State Banner */}
        <div className="rounded-xl border border-primary/25 bg-gradient-to-r from-primary/10 via-background to-accent/10 p-3 text-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-[280px]">
            <Lightbulb className="h-4 w-4 text-primary shrink-0" />
            <span className="text-muted-foreground">
              {knowledgeSummary.title}:{" "}
              <strong className="text-foreground">{knowledgeSummary.detail}</strong>
            </span>
          </div>

          {/* Quick Course Switch Pills if multiple courses exist */}
          {learningProfile?.courses && learningProfile.courses.length > 1 && (
            <div className="flex items-center gap-1 overflow-x-auto">
              <Button
                variant={selectedCourse === "All Courses" ? "default" : "outline"}
                size="sm"
                className="h-6 text-[11px] px-2"
                onClick={() => setSelectedCourse("All Courses")}
              >
                All
              </Button>
              {learningProfile.courses.slice(0, 4).map((c) => (
                <Button
                  key={c.id || c.name}
                  variant={selectedCourse === c.name ? "default" : "outline"}
                  size="sm"
                  className="h-6 text-[11px] px-2 whitespace-nowrap"
                  onClick={() => setSelectedCourse(c.name)}
                >
                  {c.code || c.name.split(" ")[0]}
                </Button>
              ))}
            </div>
          )}
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
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                      isAi
                        ? "bg-gradient-to-tr from-primary to-accent text-primary-foreground"
                        : "bg-muted text-foreground"
                    )}
                  >
                    {isAi ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>

                  <div className={cn("space-y-1.5 max-w-xl", !isAi && "text-right")}>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {isAi ? "Synapse Gemini Tutor" : "You"}
                      </span>
                      <span>• {msg.timestamp}</span>
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

          {/* Dynamic Prompt Suggestions */}
          <div className="border-t border-border/40 p-2.5 bg-muted/20 flex flex-wrap gap-1.5">
            {recommendedPrompts.map((prompt, idx) => (
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
              placeholder={placeholderText}
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
