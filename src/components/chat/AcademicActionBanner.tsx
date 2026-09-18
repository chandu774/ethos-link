import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  CalendarClock,
  CheckCircle2,
  Plus,
  ArrowRight,
  BookOpen,
  FileCheck2,
  Send,
} from "lucide-react";
import { useSynapse, ExtractedAcademicAction } from "@/hooks/useSynapse";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export function AcademicActionBanner() {
  const synapse = useSynapse();
  const navigate = useNavigate();
  const [customInput, setCustomInput] = useState("");
  const [customExtracted, setCustomExtracted] = useState<ExtractedAcademicAction[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAddTask = (actionId: string, title: string) => {
    synapse.addExtractedActionToTasks(actionId);
    toast.success(`'${title}' added to your Tasks & Workload Plan!`);
  };

  const handleAnalyzeCustom = () => {
    if (!customInput.trim()) return;
    setIsAnalyzing(true);
    setTimeout(() => {
      const results = synapse.analyzeTextForAcademicActions(customInput);
      setCustomExtracted(results);
      setIsAnalyzing(false);
      if (results.length === 0) {
        toast.info("No academic deadlines or tasks detected in this message.");
      } else {
        toast.success(`Detected ${results.length} academic action(s)!`);
      }
    }, 400);
  };

  const handleAddCustomAction = (action: ExtractedAcademicAction) => {
    synapse.addTask(
      action.title,
      action.subject,
      `Extracted from: "${action.originalMessage}"`,
      action.deadlineText,
      action.priority,
      action.estimatedMinutes
    );
    action.isAddedToTasks = true;
    setCustomExtracted([...customExtracted]);
    toast.success(`'${action.title}' added to your Tasks!`);
  };

  return (
    <Card className="border-primary/30 bg-gradient-to-r from-primary/10 via-card to-accent/10 shadow-sm">
      <CardContent className="p-4 space-y-3">
        {/* Banner Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/30">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground">AI Academic Action Extractor</span>
                <Badge variant="outline" className="border-primary/40 bg-primary/20 text-[10px] text-primary">
                  Live Chat Intelligence
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Synapse automatically monitors class announcements & group chats to capture deadlines, assignments & quizzes.
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-primary self-start sm:self-auto"
            onClick={() => navigate("/tasks")}
          >
            <span>View Task Board</span>
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Pre-detected Faculty Announcement Demo */}
        <div className="rounded-xl border border-border/60 bg-background/70 p-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground pb-2">
            <span className="font-semibold text-foreground">Dr. Aris Thorne (DBMS Course Announcement):</span>
            <span className="text-[11px]">Today at 9:15 AM</span>
          </div>
          <p className="text-xs italic text-foreground/90 bg-muted/30 p-2 rounded-lg border border-border/40">
            \"Complete DBMS Assignment 3 by Monday. There will be a quiz on normalization Friday.\"
          </p>

          <div className="mt-3 space-y-2">
            <span className="block text-[11px] font-semibold text-primary uppercase tracking-wide">
              ? 2 Academic Actions Auto-Detected by Synapse AI:
            </span>

            <div className="grid gap-2 sm:grid-cols-2">
              {synapse.extractedActions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-primary/25 bg-card/80 p-2.5 shadow-sm"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {action.type === "assignment" ? (
                        <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                      ) : (
                        <FileCheck2 className="h-3.5 w-3.5 text-accent shrink-0" />
                      )}
                      <span className="truncate text-xs font-semibold text-foreground">
                        {action.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarClock className="h-3 w-3" /> {action.deadlineText}
                      </span>
                      <span>•</span>
                      <span>~{action.estimatedMinutes}m effort</span>
                    </div>
                  </div>

                  {action.isAddedToTasks ? (
                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0 text-[10px] shrink-0">
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Added
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      className="h-7 px-2 text-xs bg-primary text-primary-foreground font-medium shrink-0"
                      onClick={() => handleAddTask(action.id, action.title)}
                    >
                      <Plus className="mr-1 h-3 w-3" /> Add to Tasks
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Interactive Custom Extraction Tester */}
        <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">
              Try Synapse Action Extraction with Any Message:
            </span>
            <span className="text-[10px] text-muted-foreground">NLP & regex pattern extraction</span>
          </div>

          <div className="flex gap-2">
            <Input
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="e.g. 'Submit Operating Systems Lab 2 before Thursday 5 PM...'"
              className="h-8 text-xs bg-background"
              onKeyDown={(e) => e.key === "Enter" && handleAnalyzeCustom()}
            />
            <Button
              size="sm"
              className="h-8 px-3 text-xs bg-primary text-primary-foreground"
              disabled={isAnalyzing || !customInput.trim()}
              onClick={handleAnalyzeCustom}
            >
              {isAnalyzing ? "Analyzing..." : "Analyze"}
            </Button>
          </div>

          {customExtracted.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border/40">
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                Extracted from your input:
              </span>
              <div className="grid gap-2 sm:grid-cols-2">
                {customExtracted.map((action) => (
                  <div
                    key={action.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-background/80 p-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-foreground">{action.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {action.subject} • Due: {action.deadlineText}
                      </p>
                    </div>
                    {action.isAddedToTasks ? (
                      <Badge className="bg-emerald-500/15 text-emerald-600 text-[10px]">Added ?</Badge>
                    ) : (
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-primary text-primary-foreground"
                        onClick={() => handleAddCustomAction(action)}
                      >
                        <Plus className="mr-1 h-3 w-3" /> Add
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

