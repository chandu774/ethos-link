import { useState } from "react";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ClipboardList,
  Calendar,
  Clock,
  Award,
  CheckCircle2,
  FileCheck2,
  FileText,
  UploadCloud,
  Download,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Send,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useSynapse } from "@/hooks/useSynapse";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RealAssignment {
  id: string;
  title: string;
  description: string | null;
  deadline: string;
  topic: string | null;
  max_marks: number | null;
  estimated_effort: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  created_at: string;
}

interface StudentSubmission {
  id: string;
  assignment_id: string;
  user_id: string;
  submission_text: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  submitted_at: string;
  status: string;
  marks_obtained: number | null;
}

export default function AssignmentsPage() {
  const { user, profile } = useAuth();
  const synapse = useSynapse();
  const queryClient = useQueryClient();

  // Submission Dialog State
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<RealAssignment | null>(null);
  const [submissionText, setSubmissionText] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 1. Query real assignments published by faculty
  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ["student_assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignments")
        .select("*")
        .order("deadline", { ascending: true });

      if (error) throw error;
      return (data || []) as RealAssignment[];
    },
  });

  // 2. Query student's existing submissions
  const { data: submissions = [], isLoading: loadingSubmissions } = useQuery({
    queryKey: ["student_submissions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("assignment_submissions")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      return (data || []) as StudentSubmission[];
    },
    enabled: !!user,
  });

  const getSubmissionForAssignment = (assignmentId: string) => {
    return submissions.find((s) => s.assignment_id === assignmentId);
  };

  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment || !user) return;

    if (!submissionText.trim() && !pdfFile) {
      toast.error("Please provide written answers or attach a PDF solution file.");
      return;
    }

    setSubmitting(true);
    try {
      let attachmentUrl: string | null = null;
      let attachmentName: string | null = null;

      if (pdfFile) {
        if (!pdfFile.name.toLowerCase().endsWith(".pdf")) {
          toast.error("Only PDF files are supported for assignment submissions.");
          setSubmitting(false);
          return;
        }

        const cleanName = pdfFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filePath = `${user.id}/${selectedAssignment.id}_${Date.now()}_${cleanName}`;

        const { error: uploadError } = await supabase.storage
          .from("submission-files")
          .upload(filePath, pdfFile, { contentType: "application/pdf", upsert: true });

        if (uploadError) {
          console.error("PDF upload error:", uploadError);
          toast.error("Failed to upload solution PDF: " + uploadError.message);
          setSubmitting(false);
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from("submission-files")
          .getPublicUrl(filePath);

        attachmentUrl = publicUrl;
        attachmentName = pdfFile.name;
      }

      // Insert submission into database
      const { error: subError } = await supabase
        .from("assignment_submissions")
        .insert({
          assignment_id: selectedAssignment.id,
          user_id: user.id,
          submission_text: submissionText.trim() || null,
          attachment_url: attachmentUrl,
          attachment_name: attachmentName,
          status: "submitted",
          submitted_at: new Date().toISOString(),
        });

      if (subError) throw subError;

      // Update in-memory synapseCore tasks for immediate reactive task sync
      synapse.submitStudentAssignment(selectedAssignment.id, "c1", submissionText);

      toast.success(`Assignment '${selectedAssignment.title}' submitted successfully! Associated task marked completed.`);
      setSubmitDialogOpen(false);
      setSelectedAssignment(null);
      setSubmissionText("");
      setPdfFile(null);

      // Invalidate queries to refresh view
      queryClient.invalidateQueries({ queryKey: ["student_assignments"] });
      queryClient.invalidateQueries({ queryKey: ["student_submissions"] });
    } catch (err: any) {
      console.error("Submission failed:", err);
      toast.error(err.message || "Failed to submit assignment.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  const getDeadlineStatus = (deadlineIso: string, isSubmitted: boolean) => {
    if (isSubmitted) {
      return { label: "Submitted", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
    }
    const due = new Date(deadlineIso);
    const now = new Date();
    const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 0) {
      return { label: "Past Deadline", color: "bg-rose-500/10 text-rose-600 border-rose-500/20" };
    }
    if (diffHours < 24) {
      return { label: "Due Today", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" };
    }
    const days = Math.ceil(diffHours / 24);
    return { label: `Due in ${days} days`, color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" };
  };

  const submittedCount = assignments.filter((a) => !!getSubmissionForAssignment(a.id)).length;
  const pendingCount = assignments.length - submittedCount;

  return (
    <StudentLayout>
      <div className="container max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-xs font-semibold text-primary">
                Official Coursework
              </Badge>
              <span className="text-xs text-muted-foreground">• Two-Way Task Synchronization</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1">
              Classroom Assignments
            </h1>
            <p className="text-sm text-muted-foreground">
              Official assignments published by your faculty. Deadlines are automatically tracked in your To-Do list.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border bg-card/60 px-3.5 py-2 text-center">
              <div className="text-lg font-bold text-foreground">{assignments.length}</div>
              <div className="text-[10px] text-muted-foreground uppercase font-semibold">Total</div>
            </div>
            <div className="rounded-xl border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50 px-3.5 py-2 text-center">
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{submittedCount}</div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-semibold">Done</div>
            </div>
            <div className="rounded-xl border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 px-3.5 py-2 text-center">
              <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{pendingCount}</div>
              <div className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-semibold">Pending</div>
            </div>
          </div>
        </div>

        {/* Assignments Roster */}
        {loadingAssignments ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading coursework...</p>
          </div>
        ) : assignments.length === 0 ? (
          <Card className="border-dashed p-12 text-center bg-card/50">
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <ClipboardList className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground">No Assignments Due</h3>
              <p className="text-xs text-muted-foreground max-w-md">
                You're all caught up! When instructors publish coursework, it will appear here along with attached problem sheets and auto-sync to your To-Do list.
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-6">
            {assignments.map((asg) => {
              const submission = getSubmissionForAssignment(asg.id);
              const isSubmitted = !!submission;
              const statusInfo = getDeadlineStatus(asg.deadline, isSubmitted);

              return (
                <Card
                  key={asg.id}
                  className={`border shadow-sm transition-all ${
                    isSubmitted
                      ? "border-emerald-500/30 bg-card/60"
                      : "border-border hover:border-primary/40 bg-card"
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-xs font-semibold bg-primary/10 text-primary border-primary/20">
                            {asg.topic || "Coursework"}
                          </Badge>
                          <Badge variant="outline" className={`text-xs font-semibold ${statusInfo.color}`}>
                            {statusInfo.label}
                          </Badge>
                          {isSubmitted && (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 text-xs gap-1 border-emerald-500/30">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Submitted</span>
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg font-bold mt-1.5">{asg.title}</CardTitle>
                        {asg.description && (
                          <CardDescription className="text-sm mt-1">{asg.description}</CardDescription>
                        )}
                      </div>

                      <div>
                        {isSubmitted ? (
                          <Badge className="bg-emerald-600 text-white gap-1.5 py-1 px-3 text-xs">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Turned In</span>
                          </Badge>
                        ) : (
                          <Button
                            onClick={() => {
                              setSelectedAssignment(asg);
                              setSubmitDialogOpen(true);
                            }}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 font-semibold text-xs shadow-sm shadow-primary/20"
                          >
                            <Send className="h-3.5 w-3.5" />
                            <span>Submit Assignment</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Meta bar */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground p-3 rounded-xl bg-muted/40 border">
                      <span className="flex items-center gap-1.5 font-medium text-foreground">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        Due: {formatDateTime(asg.deadline)}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1.5">
                        <Award className="h-3.5 w-3.5 text-amber-500" />
                        Max Marks: {asg.max_marks || 20}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-blue-500" />
                        Est. Effort: {asg.estimated_effort || "45 min"}
                      </span>
                    </div>

                    {/* Teacher's PDF Attachment */}
                    {asg.attachment_url && (
                      <div className="flex items-center justify-between p-3 rounded-xl border bg-rose-50/40 dark:bg-rose-950/10 border-rose-200/60 dark:border-rose-900/40">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                              <span>Instructor Attachment (PDF):</span>
                              <span className="font-mono text-primary">{asg.attachment_name || "Assignment.pdf"}</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground">Download the problem sheet and instructions.</p>
                          </div>
                        </div>
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        >
                          <a href={asg.attachment_url} target="_blank" rel="noopener noreferrer">
                            <Download className="h-3.5 w-3.5" />
                            <span>View / Download PDF</span>
                          </a>
                        </Button>
                      </div>
                    )}

                    {/* Student's Completed Submission Card */}
                    {isSubmitted && submission && (
                      <div className="p-3 rounded-xl border bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-200/60 dark:border-emerald-900/40 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                            Your Turned-In Submission
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            Submitted on {formatDateTime(submission.submitted_at)}
                          </span>
                        </div>

                        {submission.submission_text && (
                          <p className="text-xs text-foreground bg-background/60 p-2 rounded-lg">
                            {submission.submission_text}
                          </p>
                        )}

                        {submission.attachment_url && (
                          <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-1.5 text-xs">
                              <FileText className="h-3.5 w-3.5 text-rose-500" />
                              <span className="font-mono font-medium text-foreground">{submission.attachment_name || "My_Solution.pdf"}</span>
                            </div>
                            <Button asChild variant="ghost" size="sm" className="h-6 text-xs text-primary gap-1">
                              <a href={submission.attachment_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3 w-3" />
                                <span>View Uploaded PDF</span>
                              </a>
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Modal: Submit Assignment */}
        <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                <span>Submit Assignment: {selectedAssignment?.title}</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Upload your solution PDF and enter any notes for your instructor.
              </DialogDescription>
            </DialogHeader>

            {selectedAssignment && (
              <form onSubmit={handleSubmitAssignment} className="space-y-4 py-2">
                <div className="p-3 rounded-xl border bg-muted/40 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subject / Topic:</span>
                    <span className="font-semibold text-foreground">{selectedAssignment.topic || "Coursework"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deadline:</span>
                    <span className="font-semibold text-foreground">{formatDateTime(selectedAssignment.deadline)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Marks:</span>
                    <span className="font-semibold text-foreground">{selectedAssignment.max_marks || 20} Marks</span>
                  </div>
                </div>

                {/* Teacher's PDF link in submission modal */}
                {selectedAssignment.attachment_url && (
                  <div className="flex items-center justify-between p-2.5 rounded-lg border bg-rose-50/30 dark:bg-rose-950/10 border-rose-200 text-xs">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-rose-500" />
                      Question Sheet:
                    </span>
                    <Button asChild variant="ghost" size="sm" className="h-6 text-xs text-rose-600 gap-1">
                      <a href={selectedAssignment.attachment_url} target="_blank" rel="noopener noreferrer">
                        <Download className="h-3 w-3" />
                        <span>Download PDF</span>
                      </a>
                    </Button>
                  </div>
                )}

                {/* Written Notes */}
                <div className="space-y-1.5">
                  <Label htmlFor="sub-text" className="text-xs font-semibold">
                    Solution Notes / Text Answers
                  </Label>
                  <Textarea
                    id="sub-text"
                    value={submissionText}
                    onChange={(e) => setSubmissionText(e.target.value)}
                    placeholder="Provide your solution text, methodology, or notes for the faculty..."
                    className="text-xs min-h-[90px]"
                  />
                </div>

                {/* PDF Solution File Upload */}
                <div className="space-y-1.5 p-3 rounded-xl border border-dashed bg-muted/30">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sub-pdf" className="text-xs font-semibold flex items-center gap-1.5">
                      <UploadCloud className="h-4 w-4 text-primary" />
                      <span>Upload Solution Document (PDF)</span>
                    </Label>
                    {pdfFile && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setPdfFile(null)}
                        className="h-5 text-[10px] text-rose-500 px-1"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <Input
                    id="sub-pdf"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                    className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-primary/10 file:text-primary"
                  />
                  {pdfFile ? (
                    <p className="text-[11px] text-emerald-600 font-medium mt-1">
                      Selected: {pdfFile.name} ({(pdfFile.size / 1024).toFixed(1)} KB)
                    </p>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">
                      Attach your completed homework or lab report in PDF format.
                    </p>
                  )}
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSubmitDialogOpen(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={submitting}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 font-semibold"
                  >
                    {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>Submit Work</span>
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </StudentLayout>
  );
}
