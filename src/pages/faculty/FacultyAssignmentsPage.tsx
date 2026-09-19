import { useState, useEffect } from "react";
import { FacultyLayout } from "@/components/layout/FacultyLayout";
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
  Plus,
  ClipboardList,
  Calendar,
  Clock,
  Award,
  CheckCircle2,
  FileCheck2,
  Lock,
  Edit2,
  Trash2,
  FileText,
  Upload,
  Download,
  ExternalLink,
  Loader2,
  Users,
  Eye,
} from "lucide-react";
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
  created_by: string;
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
  student?: {
    name: string | null;
    roll_number: string | null;
    email: string | null;
  };
}

export default function FacultyAssignmentsPage() {
  const { user } = useAuth();
  const synapse = useSynapse();

  const [assignments, setAssignments] = useState<RealAssignment[]>([]);
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [teachingAssignments, setTeachingAssignments] = useState<any[]>([]);
  const [selectedCohortId, setSelectedCohortId] = useState("");

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [editDeadlineOpen, setEditDeadlineOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<RealAssignment | null>(null);

  // View submissions dialog
  const [viewSubmissionsOpen, setViewSubmissionsOpen] = useState(false);
  const [currentViewingAssignment, setCurrentViewingAssignment] = useState<RealAssignment | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [topic, setTopic] = useState("");
  const [deadlineDate, setDeadlineDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    d.setHours(23, 59, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [maxMarks, setMaxMarks] = useState("20");
  const [estimatedEffort, setEstimatedEffort] = useState("45 min");
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  // Edit deadline state
  const [newDeadlineDate, setNewDeadlineDate] = useState("");

  const fetchAssignmentsAndSubmissions = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch faculty's teaching assignments
      const { data: taData } = await supabase
        .from("teaching_assignments")
        .select(`
          id,
          subject_name,
          subject_code,
          classroom_id,
          classroom:classrooms!teaching_assignments_classroom_id_fkey(
            name,
            course,
            branch,
            year,
            section
          )
        `)
        .eq("faculty_id", user.id);

      const cohorts = (taData as any[]) || [];
      setTeachingAssignments(cohorts);
      if (cohorts.length > 0 && !selectedCohortId) {
        setSelectedCohortId(cohorts[0].id);
      }

      const teachingIds = cohorts.map((c) => c.id);

      // 2. Fetch assignments scoped to faculty
      let query = supabase
        .from("assignments")
        .select("*")
        .order("created_at", { ascending: false });

      if (teachingIds.length > 0) {
        query = query.or(`created_by.eq.${user.id},teaching_assignment_id.in.(${teachingIds.join(",")})`);
      } else {
        query = query.eq("created_by", user.id);
      }

      const { data: asgData, error: asgError } = await query;
      if (asgError) throw asgError;
      setAssignments((asgData as RealAssignment[]) || []);

      // 2. Fetch student submissions
      const { data: subData, error: subError } = await supabase
        .from("assignment_submissions")
        .select(`
          id,
          assignment_id,
          user_id,
          submission_text,
          attachment_url,
          attachment_name,
          submitted_at,
          status,
          marks_obtained,
          student:user_id (
            name,
            roll_number,
            email
          )
        `);

      if (!subError && subData) {
        setSubmissions(subData as any);
      }
    } catch (err: any) {
      console.error("Failed to fetch coursework:", err);
      toast.error("Failed to load assignments from database");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignmentsAndSubmissions();
  }, []);

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter an assignment title");
      return;
    }
    if (!deadlineDate) {
      toast.error("Please set an assignment deadline");
      return;
    }

    setCreateLoading(true);
    try {
      let attachmentUrl: string | null = null;
      let attachmentName: string | null = null;

      // Upload PDF if attached
      if (pdfFile) {
        if (!pdfFile.name.toLowerCase().endsWith(".pdf")) {
          toast.error("Only PDF files are supported for assignment attachments.");
          setCreateLoading(false);
          return;
        }

        const cleanName = pdfFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filePath = `${user?.id || "faculty"}/${Date.now()}_${cleanName}`;

        const { error: uploadError } = await supabase.storage
          .from("assignment-files")
          .upload(filePath, pdfFile, { contentType: "application/pdf", upsert: true });

        if (uploadError) {
          console.error("PDF upload error:", uploadError);
          toast.error("Failed to upload attached PDF: " + uploadError.message);
          setCreateLoading(false);
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from("assignment-files")
          .getPublicUrl(filePath);

        attachmentUrl = publicUrl;
        attachmentName = pdfFile.name;
      }

      const isoDeadline = new Date(deadlineDate).toISOString();
      const cohort = teachingAssignments.find((c) => c.id === selectedCohortId);

      // Insert into public.assignments
      const { data: createdAsg, error: insertError } = await supabase
        .from("assignments")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          deadline: isoDeadline,
          max_marks: Number(maxMarks) || 20,
          topic: topic.trim() || cohort?.subject_name || "Coursework",
          subject: cohort?.subject_name || null,
          teaching_assignment_id: cohort?.id || null,
          classroom_id: cohort?.classroom_id || null,
          estimated_effort: estimatedEffort,
          attachment_url: attachmentUrl,
          attachment_name: attachmentName,
          created_by: user?.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Also trigger reactive core update so student in-memory task listeners update instantly
      synapse.createTeacherAssignment("c1", {
        title: title.trim(),
        description: description.trim(),
        dueDate: new Date(deadlineDate).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        maxScore: Number(maxMarks) || 20,
      });

      toast.success(`Official assignment '${title}' published! Deadlines automatically synchronized to student tasks.`);
      setCreateOpen(false);

      // Reset form
      setTitle("");
      setDescription("");
      setPdfFile(null);

      // Refresh list
      fetchAssignmentsAndSubmissions();
    } catch (err: any) {
      console.error("Failed to create assignment:", err);
      toast.error(err.message || "Failed to create assignment");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdateDeadline = async () => {
    if (!selectedAssignment || !newDeadlineDate) return;

    setEditLoading(true);
    try {
      const isoDeadline = new Date(newDeadlineDate).toISOString();
      const { error } = await supabase
        .from("assignments")
        .update({ deadline: isoDeadline, updated_at: new Date().toISOString() })
        .eq("id", selectedAssignment.id);

      if (error) throw error;

      toast.success("Deadline updated! Student tasks synchronized in real-time.");
      setEditDeadlineOpen(false);
      setSelectedAssignment(null);
      fetchAssignmentsAndSubmissions();
    } catch (err: any) {
      toast.error(err.message || "Failed to update deadline");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string, asgTitle: string) => {
    if (!confirm(`Are you sure you want to delete '${asgTitle}'? Associated student tasks and submissions will also be removed.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("assignments")
        .delete()
        .eq("id", assignmentId);

      if (error) throw error;

      toast.success(`Assignment '${asgTitle}' deleted.`);
      fetchAssignmentsAndSubmissions();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete assignment");
    }
  };

  const getSubmissionsForAssignment = (asgId: string) => {
    return submissions.filter((s) => s.assignment_id === asgId);
  };

  const formatDateTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <FacultyLayout>
      <div className="container max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 text-xs">
                Official Coursework Studio
              </Badge>
              <span className="text-xs text-muted-foreground">• Real-time Database & To-Do Sync</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1">
              Coursework & Assignments
            </h1>
            <p className="text-sm text-muted-foreground">
              Create official assignments with PDF problem sheets. Deadlines auto-synchronize to students' To-Do task managers.
            </p>
          </div>

          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-semibold shadow-md shadow-indigo-600/20"
          >
            <Plus className="h-4 w-4" />
            <span>Create Assignment</span>
          </Button>
        </div>

        {/* Assignments List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-indigo-600" />
              <span>Published Classroom Assignments</span>
            </h2>
            <Badge variant="secondary" className="text-xs">
              {assignments.length} Total
            </Badge>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              <p className="text-sm text-muted-foreground">Loading coursework roster...</p>
            </div>
          ) : assignments.length === 0 ? (
            <Card className="border-dashed p-12 text-center bg-card/50">
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                  <ClipboardList className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">No Assignments Published Yet</h3>
                <p className="text-xs text-muted-foreground max-w-md">
                  When you publish an assignment, it appears directly in the student portal, attaches your PDF sheet, and synchronizes the deadline to students' To-Do lists.
                </p>
                <Button
                  onClick={() => setCreateOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 mt-2"
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create First Assignment</span>
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid gap-6">
              {assignments.map((asg) => {
                const asgSubmissions = getSubmissionsForAssignment(asg.id);
                const isOverdue = new Date(asg.deadline) < new Date();

                return (
                  <Card key={asg.id} className="shadow-card border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {asg.subject && (
                              <Badge className="bg-indigo-600 text-white text-xs">
                                {asg.subject}
                              </Badge>
                            )}
                            <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 text-xs">
                              {asg.topic || "Coursework"}
                            </Badge>
                            <Badge variant="outline" className={`text-xs ${isOverdue ? "text-rose-600 border-rose-500/30" : "text-emerald-600 border-emerald-500/30"}`}>
                              {isOverdue ? "Closed / Past Deadline" : "Active & Open"}
                            </Badge>
                          </div>
                          <CardTitle className="text-lg font-bold mt-1">{asg.title}</CardTitle>
                          {asg.description && (
                            <CardDescription className="text-sm mt-1">{asg.description}</CardDescription>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs gap-1"
                            onClick={() => {
                              setSelectedAssignment(asg);
                              setNewDeadlineDate(new Date(asg.deadline).toISOString().slice(0, 16));
                              setEditDeadlineOpen(true);
                            }}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            <span>Modify Deadline</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 h-8 w-8 p-0"
                            onClick={() => handleDeleteAssignment(asg.id, asg.title)}
                            title="Delete Assignment"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Meta badges */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground p-3 rounded-xl bg-muted/40 border">
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                          Deadline: {formatDateTime(asg.deadline)}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Award className="h-3.5 w-3.5 text-amber-500" />
                          Max Marks: {asg.max_marks || 20}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-blue-500" />
                          Est. Effort: {asg.estimated_effort || "45 min"}
                        </span>
                        <span>•</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          Submissions: {asgSubmissions.length} Student{asgSubmissions.length === 1 ? "" : "s"}
                        </span>
                      </div>

                      {/* PDF Attachment (Teacher Prompt) */}
                      {asg.attachment_url && (
                        <div className="flex items-center justify-between p-3 rounded-xl border bg-rose-50/40 dark:bg-rose-950/10 border-rose-200/60 dark:border-rose-900/40">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                <span>Attached Assignment Sheet (PDF):</span>
                                <span className="font-mono text-primary">{asg.attachment_name || "Assignment.pdf"}</span>
                              </div>
                              <p className="text-[11px] text-muted-foreground">Provided to all students for review.</p>
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

                      {/* Submission Tracking Bar & Button */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="text-xs text-muted-foreground">
                          {asgSubmissions.length === 0
                            ? "No students have submitted yet. As students turn in work, their responses will appear here."
                            : `${asgSubmissions.length} student submission(s) ready for review.`}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs gap-1.5"
                          onClick={() => {
                            setCurrentViewingAssignment(asg);
                            setViewSubmissionsOpen(true);
                          }}
                        >
                          <Eye className="h-3.5 w-3.5 text-indigo-600" />
                          <span>View Submissions ({asgSubmissions.length})</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal: Create Official Assignment */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-indigo-600" />
                <span>Publish Official Assignment</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Creates an assignment in the database. Deadlines automatically sync to student To-Do lists.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateAssignment} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="asg-title" className="text-xs font-semibold">Assignment Title *</Label>
                <Input
                  id="asg-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. DBMS Assignment 1: Relational Decomposition"
                  className="text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="asg-desc" className="text-xs font-semibold">Problem Statement / Instructions</Label>
                <Textarea
                  id="asg-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail the assignment instructions, problem numbers, or guidelines..."
                  className="text-xs min-h-[80px]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="asg-cohort" className="text-xs font-semibold">Assign to Teaching Cohort *</Label>
                <select
                  id="asg-cohort"
                  value={selectedCohortId}
                  onChange={(e) => setSelectedCohortId(e.target.value)}
                  className="w-full h-9 rounded-md border bg-background px-3 text-xs"
                  required
                >
                  {teachingAssignments.length === 0 ? (
                    <option value="">No teaching assignments allocated</option>
                  ) : (
                    teachingAssignments.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.subject_name} • {c.classroom?.name} ({c.classroom?.course} - Sec {c.classroom?.section})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="asg-topic" className="text-xs font-semibold">Topic / Unit</Label>
                  <Input
                    id="asg-topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Unit 3: Normalization"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="asg-marks" className="text-xs font-semibold">Max Marks</Label>
                  <Input
                    id="asg-marks"
                    type="number"
                    value={maxMarks}
                    onChange={(e) => setMaxMarks(e.target.value)}
                    placeholder="20"
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="asg-deadline" className="text-xs font-semibold">Deadline Date & Time *</Label>
                  <Input
                    id="asg-deadline"
                    type="datetime-local"
                    value={deadlineDate}
                    onChange={(e) => setDeadlineDate(e.target.value)}
                    className="text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="asg-effort" className="text-xs font-semibold">Estimated Effort</Label>
                  <Input
                    id="asg-effort"
                    value={estimatedEffort}
                    onChange={(e) => setEstimatedEffort(e.target.value)}
                    placeholder="45 min"
                    className="text-xs"
                  />
                </div>
              </div>

              {/* PDF Document Upload */}
              <div className="space-y-1.5 p-3 rounded-xl border border-dashed bg-muted/30">
                <div className="flex items-center justify-between">
                  <Label htmlFor="asg-pdf" className="text-xs font-semibold flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-rose-500" />
                    <span>Attach PDF Assignment Sheet (Optional)</span>
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
                  id="asg-pdf"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-primary/10 file:text-primary"
                />
                {pdfFile && (
                  <p className="text-[11px] text-emerald-600 font-medium mt-1">
                    Selected: {pdfFile.name} ({(pdfFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground">
                  Upload problem statement sheets, diagrams, or reference PDFs for students.
                </p>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCreateOpen(false)}
                  disabled={createLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={createLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                >
                  {createLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Publish & Sync Tasks</span>
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal: Modify Deadline */}
        <Dialog open={editDeadlineOpen} onOpenChange={setEditDeadlineOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Update Assignment Deadline</DialogTitle>
              <DialogDescription className="text-xs">
                Updating this deadline automatically synchronizes the new due date in all enrolled students' To-Do task managers.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Label htmlFor="new-deadline" className="text-xs font-semibold">New Due Date & Time</Label>
              <Input
                id="new-deadline"
                type="datetime-local"
                value={newDeadlineDate}
                onChange={(e) => setNewDeadlineDate(e.target.value)}
                className="text-sm"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditDeadlineOpen(false)}
                disabled={editLoading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleUpdateDeadline}
                disabled={editLoading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {editLoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                <span>Update & Sync To-Do</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: View Student Submissions */}
        <Dialog open={viewSubmissionsOpen} onOpenChange={setViewSubmissionsOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600" />
                <span>Student Submissions: {currentViewingAssignment?.title}</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Review work turned in by students, including their text explanations and submitted solution PDFs.
              </DialogDescription>
            </DialogHeader>

            {currentViewingAssignment && (
              <div className="space-y-4 py-2">
                {getSubmissionsForAssignment(currentViewingAssignment.id).length === 0 ? (
                  <div className="text-center py-10 border rounded-xl bg-muted/20">
                    <p className="text-sm font-semibold text-foreground">No submissions yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Students will submit their work from the student portal.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getSubmissionsForAssignment(currentViewingAssignment.id).map((sub) => (
                      <Card key={sub.id} className="border shadow-none bg-card/60">
                        <CardContent className="p-4 space-y-2.5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
                            <div>
                              <div className="font-bold text-sm text-foreground">
                                {sub.student?.name || "Student"}
                              </div>
                              <div className="text-xs text-muted-foreground font-mono">
                                Roll No: {sub.student?.roll_number || "—"} • {sub.student?.email}
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 text-[10px]">
                                Submitted ✓
                              </Badge>
                              <div className="text-[11px] text-muted-foreground mt-0.5">
                                {formatDateTime(sub.submitted_at)}
                              </div>
                            </div>
                          </div>

                          {sub.submission_text && (
                            <div className="text-xs text-foreground bg-muted/40 p-2.5 rounded-lg">
                              <span className="font-semibold text-muted-foreground block mb-1">Student Notes:</span>
                              {sub.submission_text}
                            </div>
                          )}

                          {sub.attachment_url && (
                            <div className="flex items-center justify-between p-2 rounded-lg bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-rose-500" />
                                <span className="text-xs font-mono font-medium text-foreground">
                                  {sub.attachment_name || "Solution.pdf"}
                                </span>
                              </div>
                              <Button asChild size="sm" variant="ghost" className="h-7 text-xs text-indigo-600 gap-1">
                                <a href={sub.attachment_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  <span>View PDF</span>
                                </a>
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setViewSubmissionsOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </FacultyLayout>
  );
}
