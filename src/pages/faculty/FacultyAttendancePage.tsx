import { useState, useEffect } from "react";
import { FacultyLayout } from "@/components/layout/FacultyLayout";
import { Card, CardContent } from "@/components/ui/card";
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
  History,
  BookOpen,
  Loader2,
  School,
  RotateCcw,
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
  present_count: number;
  absent_count: number;
  total_students: number;
  present_students: string[];
  absent_students: string[];
}

function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function FacultyAttendancePage() {
  const { user } = useAuth();

  const [loadingCohorts, setLoadingCohorts] = useState(true);
  const [teachingCohorts, setTeachingCohorts] = useState<TeachingCohort[]>([]);
  const [selectedCohortId, setSelectedCohortId] = useState("");

  // Daily attendance state
  const [sessionDate, setSessionDate] = useState(getTodayString);
  const [sessionTopic, setSessionTopic] = useState("");
  const [teachingNotes, setTeachingNotes] = useState("");
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [savingSession, setSavingSession] = useState(false);
  const [existingSessionId, setExistingSessionId] = useState<string | null>(null);

  // History state
  const [historySessions, setHistorySessions] = useState<ClassSessionItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedSessionDetail, setSelectedSessionDetail] = useState<ClassSessionItem | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

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

  // 2. Load student roster & auto-load existing attendance if previously saved for this cohort + date
  const loadRosterAndAttendance = async (cohortId: string, dateStr: string) => {
    const cohort = teachingCohorts.find((c) => c.id === cohortId);
    if (!cohort || !cohort.classroom_id) {
      setStudents([]);
      setExistingSessionId(null);
      setSessionTopic("");
      setTeachingNotes("");
      return;
    }

    setLoadingStudents(true);
    try {
      // A. Fetch roster members
      const { data: members, error: membersErr } = await supabase
        .from("classroom_members")
        .select(`
          student:profiles!classroom_members_student_id_fkey (
            id,
            name,
            roll_number
          )
        `)
        .eq("classroom_id", cohort.classroom_id);

      if (membersErr) throw membersErr;

      const roster: { id: string; name: string; roll_number: string }[] = (members || [])
        .filter((m: any) => m.student)
        .map((m: any) => ({
          id: m.student.id,
          name: m.student.name || "Student",
          roll_number: m.student.roll_number || "—",
        }))
        .sort((a, b) => a.roll_number.localeCompare(b.roll_number, undefined, { numeric: true }));

      // B. Check if attendance was already recorded for this cohort & date
      const { data: existingSession, error: sessErr } = await supabase
        .from("class_sessions")
        .select(`
          id,
          topic,
          teaching_notes,
          attendance_records (
            student_id,
            status
          )
        `)
        .eq("teaching_assignment_id", cohortId)
        .eq("date", dateStr)
        .maybeSingle();

      if (sessErr) {
        console.error("Error checking existing session:", sessErr);
      }

      if (existingSession) {
        // Load saved state
        setExistingSessionId(existingSession.id);
        setSessionTopic(existingSession.topic || "");
        setTeachingNotes(existingSession.teaching_notes || "");

        const statusMap = new Map<string, "present" | "absent">();
        (existingSession.attendance_records || []).forEach((rec: any) => {
          statusMap.set(rec.student_id, rec.status === "absent" ? "absent" : "present");
        });

        setStudents(
          roster.map((st) => ({
            ...st,
            status: statusMap.get(st.id) || "present",
          }))
        );
      } else {
        // Brand new session: all students default to PRESENT
        setExistingSessionId(null);
        setSessionTopic("");
        setTeachingNotes("");
        setStudents(
          roster.map((st) => ({
            ...st,
            status: "present",
          }))
        );
      }
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
      const { data: sessData, error: sessErr } = await supabase
        .from("class_sessions")
        .select(`
          id,
          date,
          topic,
          teaching_notes,
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
      loadRosterAndAttendance(selectedCohortId, sessionDate);
      fetchAttendanceHistory(selectedCohortId);
    }
  }, [selectedCohortId, sessionDate, teachingCohorts]);

  // Handler: Toggle single student status (PRESENT <-> ABSENT)
  const handleToggleStudent = (studentId: string) => {
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
    toast.success("All students marked as Present.");
  };

  // Handler: Save / Update Session Attendance
  const handleSaveAttendance = async () => {
    if (!sessionTopic.trim()) {
      toast.error("Please enter the topic covered today.");
      return;
    }
    if (students.length === 0) {
      toast.error("No enrolled students found in this classroom cohort.");
      return;
    }

    setSavingSession(true);
    try {
      let sessionId = existingSessionId;

      if (sessionId) {
        // Update existing class_session
        const { error: sessionErr } = await supabase
          .from("class_sessions")
          .update({
            topic: sessionTopic.trim(),
            teaching_notes: teachingNotes.trim() || null,
          })
          .eq("id", sessionId);

        if (sessionErr) throw sessionErr;

        // Clean up previous records to prevent duplicates
        const { error: delErr } = await supabase
          .from("attendance_records")
          .delete()
          .eq("session_id", sessionId);

        if (delErr) throw delErr;
      } else {
        // Insert new class_session
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
        sessionId = sessionData.id;
        setExistingSessionId(sessionId);
      }

      // Sync topic into session_concepts for analytics and recommendations
      if (sessionTopic.trim()) {
        await supabase.from("session_concepts").delete().eq("session_id", sessionId);
        await supabase
          .from("session_concepts")
          .insert([{ session_id: sessionId, concept_name: sessionTopic.trim() }]);
      }

      // Insert fresh attendance_records
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
      const absentCount = students.filter((s) => s.status === "absent").length;

      toast.success(
        existingSessionId
          ? `Attendance updated successfully (${presentCount} Present, ${absentCount} Absent)`
          : `Attendance posted successfully (${presentCount} Present, ${absentCount} Absent)`
      );

      // Refresh history records
      fetchAttendanceHistory(selectedCohortId);
    } catch (err: any) {
      console.error("Error saving attendance:", err);
      toast.error("Failed to save attendance: " + (err.message || "Unknown error"));
    } finally {
      setSavingSession(false);
    }
  };

  const selectedCohort = teachingCohorts.find((c) => c.id === selectedCohortId);
  const presentCount = students.filter((s) => s.status === "present").length;
  const absentCount = students.filter((s) => s.status === "absent").length;

  return (
    <FacultyLayout>
      <div className="container max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        {/* HEADER & COHORT/DATE CONTROLS */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/80">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Attendance
            </h1>
            {selectedCohort && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 font-medium">
                {selectedCohort.subject_name} · {selectedCohort.classroom?.name}
              </p>
            )}
          </div>

          {/* Quick Selectors: Class / Cohort & Date */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="w-full sm:w-64">
              <Label htmlFor="cohort-select" className="text-[11px] font-semibold text-muted-foreground block mb-1">
                Class / Cohort
              </Label>
              <select
                id="cohort-select"
                value={selectedCohortId}
                onChange={(e) => setSelectedCohortId(e.target.value)}
                disabled={loadingCohorts || teachingCohorts.length === 0}
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {teachingCohorts.length === 0 ? (
                  <option value="">No classes assigned</option>
                ) : (
                  teachingCohorts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.subject_name} · {c.classroom?.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="w-full sm:w-40">
              <Label htmlFor="session-date" className="text-[11px] font-semibold text-muted-foreground block mb-1">
                Date
              </Label>
              <Input
                id="session-date"
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="h-9 text-xs font-semibold text-foreground bg-background"
              />
            </div>
          </div>
        </div>

        {/* MAIN BODY */}
        {loadingCohorts ? (
          <div className="flex items-center justify-center p-16 bg-muted/20 rounded-2xl border border-dashed">
            <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
          </div>
        ) : teachingCohorts.length === 0 ? (
          <Card className="border-dashed border-2 bg-muted/20">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                <School className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-foreground">No Teaching Cohorts Assigned</h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                You are not currently assigned to any classroom cohorts. Please contact your institutional administrator.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="daily" className="space-y-6">
            <TabsList className="bg-muted/50 p-1">
              <TabsTrigger value="daily" className="text-xs gap-1.5 font-semibold">
                <CalendarCheck className="h-3.5 w-3.5" />
                <span>Take Attendance</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs gap-1.5 font-semibold">
                <History className="h-3.5 w-3.5" />
                <span>Session History ({historySessions.length})</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: FAST 30-SECOND ATTENDANCE WORKFLOW */}
            <TabsContent value="daily" className="space-y-6">
              {/* ATTENDANCE SUMMARY BAR */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-muted/40 border border-border/70 text-xs">
                <div className="flex items-center gap-4 sm:gap-6">
                  <div>
                    <span className="text-muted-foreground font-medium">Total:</span>{" "}
                    <span className="font-bold text-foreground text-sm">{students.length}</span>
                  </div>
                  <div className="h-4 w-px bg-border" />
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="text-muted-foreground font-medium">Present:</span>{" "}
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {presentCount}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                    <span className="text-muted-foreground font-medium">Absent:</span>{" "}
                    <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">
                      {absentCount}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {absentCount > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={handleMarkAllPresent}
                      className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2.5"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Mark all present</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* STUDENT ROLL NUMBERS GRID */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Student Roll Numbers
                  </h2>
                  <span className="text-[11px] text-muted-foreground hidden sm:inline">
                    Tap absent students
                  </span>
                </div>

                {loadingStudents ? (
                  <div className="flex items-center justify-center p-12 bg-muted/10 rounded-2xl border border-dashed">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                  </div>
                ) : students.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground border rounded-2xl bg-muted/10">
                    <Users className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                    <p className="text-sm font-semibold text-foreground">No students enrolled in this classroom</p>
                    <p className="text-xs mt-1 text-muted-foreground">
                      Students assigned to this classroom cohort will appear here automatically.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                      {students.map((student) => {
                        const isAbsent = student.status === "absent";
                        return (
                          <button
                            key={student.id}
                            type="button"
                            onClick={() => handleToggleStudent(student.id)}
                            className={`group relative flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl border text-center transition-all select-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                              isAbsent
                                ? "bg-rose-500/10 border-rose-500/50 text-rose-600 dark:text-rose-400 font-bold ring-1 ring-rose-500/30 shadow-xs"
                                : "bg-card hover:bg-muted/40 border-border text-foreground font-medium hover:border-primary/40 shadow-xs"
                            }`}
                            aria-label={`Roll ${student.roll_number}, currently ${student.status}`}
                            title={`${student.name} (${student.roll_number}) • Click to toggle`}
                          >
                            <span className="font-mono text-xs sm:text-sm tracking-wide font-semibold">
                              {student.roll_number}
                            </span>
                            {isAbsent && (
                              <span className="text-[9px] uppercase tracking-wider font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                                Absent
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground text-center sm:text-left pt-1">
                      Click a roll number to mark the student absent. All students are marked present by default.
                    </p>
                  </>
                )}
              </div>

              {/* TODAY'S LESSON */}
              <div className="pt-4 border-t border-border/80 space-y-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                    Today's Lesson
                  </h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="session-topic" className="text-xs font-semibold text-foreground">
                      Topic Covered <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="session-topic"
                      value={sessionTopic}
                      onChange={(e) => setSessionTopic(e.target.value)}
                      placeholder="e.g. Normalization & Decomposition"
                      className="text-xs sm:text-sm h-10 bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="session-notes" className="text-xs font-semibold text-muted-foreground">
                      Teaching Notes <span className="text-xs font-normal">(optional)</span>
                    </Label>
                    <Textarea
                      id="session-notes"
                      value={teachingNotes}
                      onChange={(e) => setTeachingNotes(e.target.value)}
                      placeholder="e.g. Covered 2NF and 3NF. Students had difficulty understanding partial dependencies."
                      rows={2}
                      className="text-xs bg-background resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* POST / SAVE ATTENDANCE ACTION */}
              <div className="pt-4 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border/80">
                <div className="text-xs text-muted-foreground">
                  {existingSessionId ? (
                    <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      Editing saved attendance record for {sessionDate}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Ready to post attendance for {sessionDate}
                    </span>
                  )}
                </div>

                <Button
                  type="button"
                  onClick={handleSaveAttendance}
                  disabled={savingSession || students.length === 0}
                  className="h-11 px-8 text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-md shadow-indigo-600/20"
                >
                  {savingSession ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving Attendance...</span>
                    </>
                  ) : existingSessionId ? (
                    <>
                      <CalendarCheck className="h-4 w-4" />
                      <span>Update Attendance</span>
                    </>
                  ) : (
                    <>
                      <CalendarCheck className="h-4 w-4" />
                      <span>Post Attendance</span>
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            {/* TAB 2: ATTENDANCE HISTORY */}
            <TabsContent value="history" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Past Recorded Sessions</h3>
                  <p className="text-xs text-muted-foreground">
                    Historical logs of sessions and student turnout for this cohort.
                  </p>
                </div>
              </div>

              {loadingHistory ? (
                <div className="flex items-center justify-center p-12 bg-muted/10 rounded-2xl border border-dashed">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                </div>
              ) : historySessions.length === 0 ? (
                <Card className="border-dashed p-10 text-center bg-muted/20">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <History className="h-8 w-8 text-muted-foreground/60" />
                    <p className="text-sm font-semibold text-foreground">No sessions recorded yet</p>
                    <p className="text-xs text-muted-foreground">
                      Use the Take Attendance tab to post attendance and record what was taught.
                    </p>
                  </div>
                </Card>
              ) : (
                <div className="border border-border/80 rounded-2xl overflow-hidden bg-card shadow-xs">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs">Topic Covered</TableHead>
                        <TableHead className="text-xs">Attendance Turnout</TableHead>
                        <TableHead className="text-xs text-right">Actions</TableHead>
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
                          <TableCell className="text-xs font-semibold text-foreground font-mono">
                            {sess.date}
                          </TableCell>
                          <TableCell className="text-xs font-bold text-foreground">
                            {sess.topic}
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
                              className="text-xs text-indigo-600 hover:text-indigo-700 h-8 font-semibold"
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
          <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <CalendarCheck className="h-5 w-5 text-indigo-600" />
                <span>Session: {selectedSessionDetail?.topic}</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Date: {selectedSessionDetail?.date} • {selectedSessionDetail?.present_count}/{selectedSessionDetail?.total_students} Students Present
              </DialogDescription>
            </DialogHeader>

            {selectedSessionDetail && (
              <div className="space-y-4 py-2 text-xs">
                {/* Notes */}
                {selectedSessionDetail.teaching_notes && (
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground uppercase">
                      Teaching Notes
                    </Label>
                    <p className="p-3 rounded-xl bg-muted/30 border border-border/80 text-foreground">
                      {selectedSessionDetail.teaching_notes}
                    </p>
                  </div>
                )}

                {/* Absentees List */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-rose-600 uppercase flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Absent Students ({selectedSessionDetail.absent_students.length})</span>
                  </Label>
                  {selectedSessionDetail.absent_students.length === 0 ? (
                    <p className="text-emerald-600 font-semibold p-2.5 border border-emerald-500/20 rounded-xl bg-emerald-500/10">
                      100% Attendance — Zero absences recorded!
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/20">
                      {selectedSessionDetail.absent_students.map((st) => (
                        <Badge key={st} variant="outline" className="text-rose-600 border-rose-500/30 text-xs font-mono">
                          {st}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Present List */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-emerald-600 uppercase flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Present Students ({selectedSessionDetail.present_students.length})</span>
                  </Label>
                  <div className="flex flex-wrap gap-1 p-2 rounded-xl bg-muted/20 border border-border/80 max-h-36 overflow-y-auto">
                    {selectedSessionDetail.present_students.map((st) => (
                      <span key={st} className="text-[11px] bg-card px-2 py-0.5 rounded border border-border/70 font-mono">
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
