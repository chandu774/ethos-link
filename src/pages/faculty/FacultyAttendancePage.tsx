import { useState, useEffect } from "react";
import { FacultyLayout } from "@/components/layout/FacultyLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CalendarCheck,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Plus,
  X,
  History,
  Clock,
  BookOpen,
  Loader2,
  FileText,
  School,
  Check,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TeachingCohort {
  id: string;
  subject_name: string;
  subject_code: string | null;
  classroom_id: string;
  classroom?: {
    name: string;
    course: string;
    branch: string;
    year: number;
    section: string;
  };
}

interface EnrolledStudent {
  id: string;
  name: string;
  roll_number: string;
  status: "present" | "absent";
}

interface ClassSessionItem {
  id: string;
  date: string;
  topic: string;
  teaching_notes: string | null;
  concepts: string[];
  present_count: number;
  absent_count: number;
  total_students: number;
  present_students: string[];
  absent_students: string[];
}

export default function FacultyAttendancePage() {
  const { user } = useAuth();

  const [loadingCohorts, setLoadingCohorts] = useState(true);
  const [teachingCohorts, setTeachingCohorts] = useState<TeachingCohort[]>([]);
  const [selectedCohortId, setSelectedCohortId] = useState("");

  // Daily attendance state
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [sessionTopic, setSessionTopic] = useState("");
  const [conceptsTaught, setConceptsTaught] = useState<string[]>([]);
  const [newConceptInput, setNewConceptInput] = useState("");
  const [teachingNotes, setTeachingNotes] = useState("");
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [savingSession, setSavingSession] = useState(false);

  // History state
  const [historySessions, setHistorySessions] = useState<ClassSessionItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedSessionDetail, setSelectedSessionDetail] = useState<ClassSessionItem | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Common quick-pick concepts based on topic
  const SUGGESTED_CONCEPTS = [
    "Functional Dependencies",
    "Candidate Keys",
    "First Normal Form (1NF)",
    "Second Normal Form (2NF)",
    "Third Normal Form (3NF)",
    "BCNF Decomposition",
    "Lossless Join Property",
    "Dependency Preservation",
    "SQL Subqueries & Aggregations",
    "ACID Properties & Transactions",
    "Two-Phase Locking (2PL)",
    "B+ Tree Indexing",
  ];

  // 1. Fetch faculty's authorized teaching assignments
  const fetchCohorts = async () => {
    if (!user) return;
    setLoadingCohorts(true);
    try {
      const { data: taData, error } = await supabase
        .from("teaching_assignments")
        .select(`
          id,
          subject_name,
          subject_code,
          classroom_id,
          classroom:classrooms!teaching_assignments_classroom_id_fkey (
            name,
            course,
            branch,
            year,
            section
          )
        `)
        .eq("faculty_id", user.id);

      if (error) throw error;

      const cohorts = (taData as any[]) || [];
      setTeachingCohorts(cohorts);
      if (cohorts.length > 0 && !selectedCohortId) {
        setSelectedCohortId(cohorts[0].id);
      }
    } catch (err: any) {
      console.error("Error loading teaching assignments:", err);
      toast.error("Failed to load your teaching assignments");
    } finally {
      setLoadingCohorts(false);
    }
  };

  useEffect(() => {
    fetchCohorts();
  }, [user]);

  // 2. Load students for selected teaching assignment's classroom
  const fetchStudentsForCohort = async (cohortId: string) => {
    const cohort = teachingCohorts.find((c) => c.id === cohortId);
    if (!cohort || !cohort.classroom_id) {
      setStudents([]);
      return;
    }

    setLoadingStudents(true);
    try {
      const { data: members, error } = await supabase
        .from("classroom_members")
        .select(`
          student:profiles!classroom_members_student_id_fkey (
            id,
            name,
            roll_number
          )
        `)
        .eq("classroom_id", cohort.classroom_id);

      if (error) throw error;

      const mapped: EnrolledStudent[] = (members || [])
        .filter((m: any) => m.student)
        .map((m: any) => ({
          id: m.student.id,
          name: m.student.name || "Student",
          roll_number: m.student.roll_number || "—",
          status: "present", // Default all present as required
        }))
        .sort((a, b) => a.roll_number.localeCompare(b.roll_number));

      setStudents(mapped);
    } catch (err: any) {
      console.error("Failed to fetch students for attendance:", err);
      toast.error("Failed to load classroom roster");
    } finally {
      setLoadingStudents(false);
    }
  };

  // 3. Load attendance history for selected teaching assignment
  const fetchAttendanceHistory = async (cohortId: string) => {
    if (!cohortId) return;
    setLoadingHistory(true);

    try {
      // Fetch sessions for this teaching assignment
      const { data: sessData, error: sessErr } = await supabase
        .from("class_sessions")
        .select(`
          id,
          date,
          topic,
          teaching_notes,
          session_concepts (concept_name),
          attendance_records (
            status,
            student:profiles (name, roll_number)
          )
        `)
        .eq("teaching_assignment_id", cohortId)
        .order("date", { ascending: false });

      if (sessErr) throw sessErr;

      const parsedHistory: ClassSessionItem[] = (sessData || []).map((s: any) => {
        const records = s.attendance_records || [];
        const presents = records
          .filter((r: any) => r.status === "present")
          .map((r: any) => `${r.student?.name} (${r.student?.roll_number})`);
        const absents = records
          .filter((r: any) => r.status === "absent")
          .map((r: any) => `${r.student?.name} (${r.student?.roll_number})`);

        return {
          id: s.id,
          date: s.date,
          topic: s.topic,
          teaching_notes: s.teaching_notes,
          concepts: (s.session_concepts || []).map((c: any) => c.concept_name),
          present_count: presents.length,
          absent_count: absents.length,
          total_students: records.length,
          present_students: presents,
          absent_students: absents,
        };
      });

      setHistorySessions(parsedHistory);
    } catch (err: any) {
      console.error("Error loading attendance history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (selectedCohortId) {
      fetchStudentsForCohort(selectedCohortId);
      fetchAttendanceHistory(selectedCohortId);
    }
  }, [selectedCohortId, teachingCohorts]);

  // Handler: Toggle single student status
  const handleToggleStatus = (studentId: string) => {
    setStudents((prev) =>
      prev.map((st) =>
        st.id === studentId
          ? { ...st, status: st.status === "present" ? "absent" : "present" }
          : st
      )
    );
  };

  // Handler: Mark all present
  const handleMarkAllPresent = () => {
    setStudents((prev) => prev.map((st) => ({ ...st, status: "present" })));
    toast.success("Marked all students as Present.");
  };

  // Handler: Add concept tag
  const handleAddConcept = (concept: string) => {
    const trimmed = concept.trim();
    if (!trimmed) return;
    if (conceptsTaught.includes(trimmed)) {
      toast.info("Concept already selected.");
      return;
    }
    setConceptsTaught([...conceptsTaught, trimmed]);
    setNewConceptInput("");
  };

  const handleRemoveConcept = (concept: string) => {
    setConceptsTaught(conceptsTaught.filter((c) => c !== concept));
  };

  // Handler: Save Session & Attendance
  const handleSaveSessionAttendance = async () => {
    if (!sessionTopic.trim()) {
      toast.error("Please enter the Topic taught during this session.");
      return;
    }
    if (students.length === 0) {
      toast.error("No enrolled students found in this classroom cohort.");
      return;
    }

    setSavingSession(true);
    try {
      // 1. Insert class_session
      const { data: sessionData, error: sessionErr } = await supabase
        .from("class_sessions")
        .insert({
          teaching_assignment_id: selectedCohortId,
          date: sessionDate,
          topic: sessionTopic.trim(),
          teaching_notes: teachingNotes.trim() || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (sessionErr) throw sessionErr;

      const sessionId = sessionData.id;

      // 2. Insert session_concepts
      if (conceptsTaught.length > 0) {
        const conceptsToInsert = conceptsTaught.map((c) => ({
          session_id: sessionId,
          concept_name: c,
        }));
        const { error: conceptErr } = await supabase
          .from("session_concepts")
          .insert(conceptsToInsert);

        if (conceptErr) throw conceptErr;
      }

      // 3. Insert attendance_records
      const recordsToInsert = students.map((st) => ({
        session_id: sessionId,
        student_id: st.id,
        status: st.status,
      }));

      const { error: attErr } = await supabase
        .from("attendance_records")
        .insert(recordsToInsert);

      if (attErr) throw attErr;

      const presentCount = students.filter((s) => s.status === "present").length;
      toast.success(
        `Session & Attendance saved! (${presentCount}/${students.length} Present for ${sessionTopic.trim()})`
      );

      // Reset form
      setSessionTopic("");
      setConceptsTaught([]);
      setTeachingNotes("");
      fetchAttendanceHistory(selectedCohortId);
      // Reset student list to present
      handleMarkAllPresent();
    } catch (err: any) {
      console.error("Error saving session attendance:", err);
      toast.error("Failed to record attendance: " + err.message);
    } finally {
      setSavingSession(false);
    }
  };

  const selectedCohort = teachingCohorts.find((c) => c.id === selectedCohortId);

  return (
    <FacultyLayout>
      <div className="container max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 text-xs">
                Classroom Attendance & Curriculum Recording
              </Badge>
              <span className="text-xs text-muted-foreground">• Authorized Teaching View</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mt-1">
              Class Attendance
            </h1>
            <p className="text-sm text-muted-foreground">
              Record daily attendance, capture topics and concepts taught, and review historical session logs.
            </p>
          </div>

          {/* Teaching Assignment Cohort Selector */}
          <div className="w-full sm:w-80">
            <Label htmlFor="cohort-select" className="text-xs font-semibold text-muted-foreground block mb-1">
              Teaching Assignment (Subject · Cohort)
            </Label>
            <select
              id="cohort-select"
              value={selectedCohortId}
              onChange={(e) => setSelectedCohortId(e.target.value)}
              disabled={loadingCohorts || teachingCohorts.length === 0}
              className="w-full h-10 rounded-md border bg-background px-3 text-xs font-semibold"
            >
              {teachingCohorts.length === 0 ? (
                <option value="">No teaching assignments allocated</option>
              ) : (
                teachingCohorts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.subject_name} ({c.subject_code || "SUB"}) · {c.classroom?.name}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {loadingCohorts ? (
          <div className="flex items-center justify-center p-20 bg-muted/20 rounded-2xl border border-dashed">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : teachingCohorts.length === 0 ? (
          <Card className="border-dashed border-2 bg-muted/20">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
              <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                <School className="h-7 w-7" />
              </div>
              <div className="max-w-md space-y-1">
                <h3 className="text-base font-bold text-foreground">No Teaching Cohorts Assigned</h3>
                <p className="text-sm text-muted-foreground">
                  You are not assigned to any subjects or classroom cohorts yet. Please contact your institutional administrator.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="daily" className="space-y-6">
            <TabsList className="bg-muted/60 p-1">
              <TabsTrigger value="daily" className="text-xs gap-1.5">
                <CalendarCheck className="h-3.5 w-3.5" />
                <span>Daily Attendance</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs gap-1.5">
                <History className="h-3.5 w-3.5" />
                <span>Attendance History ({historySessions.length})</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB: DAILY ATTENDANCE */}
            <TabsContent value="daily" className="space-y-6">
              {/* Session Meta & What Was Taught Card */}
              <Card className="shadow-card border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-indigo-600" />
                        <span>What Was Taught In This Session</span>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Capturing topic and specific concepts enables diagnostic gap tracking and recovery modules.
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="sess-date" className="text-xs font-semibold text-muted-foreground">Date:</Label>
                      <Input
                        id="sess-date"
                        type="date"
                        value={sessionDate}
                        onChange={(e) => setSessionDate(e.target.value)}
                        className="h-8 text-xs w-36"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="sess-topic" className="text-xs font-semibold">
                        Topic Covered *
                      </Label>
                      <Input
                        id="sess-topic"
                        value={sessionTopic}
                        onChange={(e) => setSessionTopic(e.target.value)}
                        placeholder="e.g. Normalization & Decomposition"
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Add Concept Tag</Label>
                      <div className="flex gap-2">
                        <Input
                          value={newConceptInput}
                          onChange={(e) => setNewConceptInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddConcept(newConceptInput);
                            }
                          }}
                          placeholder="e.g. 2NF Partial Dependencies"
                          className="text-xs"
                        />
                        <Button
                          type="button"
                          onClick={() => handleAddConcept(newConceptInput)}
                          size="sm"
                          variant="outline"
                          className="text-xs shrink-0"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Selected Concepts Tags */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      Concepts Taught ({conceptsTaught.length}):
                    </Label>
                    <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 rounded-xl bg-muted/30 border border-dashed">
                      {conceptsTaught.length === 0 ? (
                        <span className="text-xs text-muted-foreground italic">
                          No concepts added yet. Select from suggestions below or type a custom concept tag above.
                        </span>
                      ) : (
                        conceptsTaught.map((c) => (
                          <Badge
                            key={c}
                            className="bg-indigo-600 text-white text-xs gap-1 pr-1.5 py-1"
                          >
                            <span>{c}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveConcept(c)}
                              className="hover:bg-indigo-700 rounded-full p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))
                      )}
                    </div>

                    {/* Quick suggestion chips */}
                    <div className="pt-1">
                      <span className="text-[11px] text-muted-foreground font-semibold mr-1.5">Quick Suggestions:</span>
                      <div className="inline-flex flex-wrap gap-1 mt-1">
                        {SUGGESTED_CONCEPTS.slice(0, 6).map((sc) => (
                          <button
                            key={sc}
                            type="button"
                            onClick={() => handleAddConcept(sc)}
                            className="text-[10px] px-2 py-0.5 rounded-md border bg-card hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-muted-foreground hover:text-indigo-600 transition"
                          >
                            + {sc}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Teaching Notes */}
                  <div className="space-y-1.5">
                    <Label htmlFor="sess-notes" className="text-xs font-semibold">
                      Teaching Notes (Optional)
                    </Label>
                    <Textarea
                      id="sess-notes"
                      value={teachingNotes}
                      onChange={(e) => setTeachingNotes(e.target.value)}
                      placeholder="e.g. Covered Boyce-Codd Normal Form proof. Several students struggled on composite key decomposition."
                      rows={2}
                      className="text-xs"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Student Attendance Roster Card */}
              <Card className="shadow-card border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                        <Users className="h-4 w-4 text-indigo-600" />
                        <span>Student Attendance: {selectedCohort?.subject_name} · {selectedCohort?.classroom?.name}</span>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Default status is Present. Toggle absentees with a single click.
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        onClick={handleMarkAllPresent}
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1 border-indigo-500/30"
                      >
                        <Check className="h-3.5 w-3.5 text-indigo-600" />
                        <span>Mark All Present</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {loadingStudents ? (
                    <div className="flex items-center justify-center p-12">
                      <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                    </div>
                  ) : students.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground border rounded-xl bg-muted/20">
                      <Users className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
                      <p className="text-sm font-semibold text-foreground">No students in this classroom yet</p>
                      <p className="text-xs mt-1">
                        Students added by administrator will automatically appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Summary indicator */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border text-xs">
                        <div>
                          <span className="text-muted-foreground">Total:</span>{" "}
                          <strong className="text-foreground">{students.length} students</strong>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-emerald-600 font-bold">
                            ● {students.filter((s) => s.status === "present").length} Present
                          </span>
                          <span className="text-rose-600 font-bold">
                            ● {students.filter((s) => s.status === "absent").length} Absent
                          </span>
                        </div>
                      </div>

                      <div className="border rounded-2xl overflow-hidden bg-card">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/40">
                              <TableHead className="w-14">#</TableHead>
                              <TableHead>Roll Number</TableHead>
                              <TableHead>Student Name</TableHead>
                              <TableHead className="text-right">Attendance Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {students.map((student, idx) => {
                              const isPresent = student.status === "present";
                              return (
                                <TableRow
                                  key={student.id}
                                  className="hover:bg-muted/20 cursor-pointer"
                                  onClick={() => handleToggleStatus(student.id)}
                                >
                                  <TableCell className="text-xs font-mono text-muted-foreground">
                                    {idx + 1}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="font-mono text-xs">
                                      {student.roll_number}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-sm font-semibold text-foreground">
                                    {student.name}
                                  </TableCell>
                                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => handleToggleStatus(student.id)}
                                      className={`h-7 text-xs font-semibold gap-1.5 transition-all ${
                                        isPresent
                                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                          : "bg-rose-600 hover:bg-rose-700 text-white"
                                      }`}
                                    >
                                      {isPresent ? (
                                        <>
                                          <CheckCircle2 className="h-3.5 w-3.5" />
                                          <span>Present</span>
                                        </>
                                      ) : (
                                        <>
                                          <XCircle className="h-3.5 w-3.5" />
                                          <span>Absent</span>
                                        </>
                                      )}
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Save Attendance Button */}
                      <div className="pt-2 flex justify-end">
                        <Button
                          type="button"
                          onClick={handleSaveSessionAttendance}
                          disabled={savingSession || students.length === 0}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 text-xs h-10 gap-2 shadow-md shadow-indigo-600/20"
                        >
                          {savingSession ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Saving Session & Attendance...</span>
                            </>
                          ) : (
                            <>
                              <CalendarCheck className="h-4 w-4" />
                              <span>Post Attendance & Session</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: ATTENDANCE HISTORY */}
            <TabsContent value="history" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">Past Recorded Sessions</h3>
                  <p className="text-xs text-muted-foreground">
                    Historical logs of sessions taught and student attendance records for this cohort.
                  </p>
                </div>
              </div>

              {loadingHistory ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                </div>
              ) : historySessions.length === 0 ? (
                <Card className="border-dashed p-10 text-center bg-muted/20">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <History className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-semibold text-foreground">No sessions recorded yet</p>
                    <p className="text-xs text-muted-foreground">
                      Use the Daily Attendance tab to post attendance and record what was taught.
                    </p>
                  </div>
                </Card>
              ) : (
                <div className="border rounded-2xl overflow-hidden bg-card shadow-card">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Date</TableHead>
                        <TableHead>Topic Covered</TableHead>
                        <TableHead>Concepts Taught</TableHead>
                        <TableHead>Attendance Ratio</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historySessions.map((sess) => (
                        <TableRow
                          key={sess.id}
                          className="hover:bg-muted/30 cursor-pointer"
                          onClick={() => {
                            setSelectedSessionDetail(sess);
                            setDetailModalOpen(true);
                          }}
                        >
                          <TableCell className="text-xs font-semibold text-foreground">
                            {new Date(sess.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </TableCell>
                          <TableCell className="text-xs font-bold text-foreground">
                            {sess.topic}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-md">
                              {sess.concepts.length === 0 ? (
                                <span className="text-[11px] text-muted-foreground">—</span>
                              ) : (
                                sess.concepts.slice(0, 3).map((c) => (
                                  <Badge key={c} variant="outline" className="text-[10px]">
                                    {c}
                                  </Badge>
                                ))
                              )}
                              {sess.concepts.length > 3 && (
                                <Badge variant="secondary" className="text-[10px]">
                                  +{sess.concepts.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`text-xs ${
                                sess.present_count / (sess.total_students || 1) >= 0.75
                                  ? "bg-emerald-600 text-white"
                                  : "bg-amber-600 text-white"
                              }`}
                            >
                              {sess.present_count} / {sess.total_students} Present
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-xs text-indigo-600 hover:text-indigo-700 h-8"
                              onClick={() => {
                                setSelectedSessionDetail(sess);
                                setDetailModalOpen(true);
                              }}
                            >
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* MODAL: SESSION DETAIL BREAKDOWN */}
        <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
          <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-indigo-600" />
                <span>Session Log: {selectedSessionDetail?.topic}</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Date: {selectedSessionDetail?.date} • {selectedSessionDetail?.present_count}/{selectedSessionDetail?.total_students} Students Present
              </DialogDescription>
            </DialogHeader>

            {selectedSessionDetail && (
              <div className="space-y-4 py-2 text-xs">
                {/* Concepts Taught */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">
                    Concepts Taught
                  </Label>
                  <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-muted/30 border">
                    {selectedSessionDetail.concepts.length === 0 ? (
                      <span className="text-muted-foreground">None specified</span>
                    ) : (
                      selectedSessionDetail.concepts.map((c) => (
                        <Badge key={c} variant="secondary" className="text-xs">
                          {c}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>

                {/* Notes */}
                {selectedSessionDetail.teaching_notes && (
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase">
                      Teaching Notes
                    </Label>
                    <p className="p-3 rounded-xl bg-muted/20 border text-foreground">
                      {selectedSessionDetail.teaching_notes}
                    </p>
                  </div>
                )}

                {/* Absentees List */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-rose-600 uppercase flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Absent Students ({selectedSessionDetail.absent_students.length})</span>
                  </Label>
                  {selectedSessionDetail.absent_students.length === 0 ? (
                    <p className="text-emerald-600 font-semibold p-2 border rounded-xl bg-emerald-500/10">
                      100% Attendance — Zero absences recorded!
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1 p-2 rounded-xl bg-rose-500/5 border border-rose-500/20">
                      {selectedSessionDetail.absent_students.map((st) => (
                        <Badge key={st} variant="outline" className="text-rose-600 border-rose-500/30 text-[11px]">
                          {st}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Present List */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-emerald-600 uppercase flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Present Students ({selectedSessionDetail.present_students.length})</span>
                  </Label>
                  <div className="flex flex-wrap gap-1 p-2 rounded-xl bg-muted/20 border max-h-40 overflow-y-auto">
                    {selectedSessionDetail.present_students.map((st) => (
                      <span key={st} className="text-[11px] bg-card px-2 py-0.5 rounded border">
                        {st}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </FacultyLayout>
  );
}
