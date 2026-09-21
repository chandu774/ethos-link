import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { FacultyLayout } from "@/components/layout/FacultyLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  Search,
  Filter,
  CalendarCheck,
  Award,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  School,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface EnrolledStudent {
  id: string;
  name: string;
  roll_number: string;
  email: string | null;
  course: string | null;
  branch: string | null;
  year: string | null;
  section: string | null;
  classroom_id: string;
  classroom_name: string;
  classroom_info: string;
  joined_at: string;
}

export default function FacultyStudentsPage() {
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassroomId, setSelectedClassroomId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [classrooms, setClassrooms] = useState<{ id: string; name: string }[]>([]);

  // Selected student for detail modal
  const [selectedStudent, setSelectedStudent] = useState<EnrolledStudent | null>(null);
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [studentQuizzes, setStudentQuizzes] = useState<any[]>([]);
  const [studentAssignments, setStudentAssignments] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  const fetchEnrolledStudents = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Fetch classrooms assigned to this faculty via teaching_assignments
      const { data: taData, error: taErr } = await supabase
        .from("teaching_assignments")
        .select(`
          classroom_id,
          classroom:classrooms!teaching_assignments_classroom_id_fkey(
            id,
            name,
            course,
            branch,
            year,
            section
          )
        `)
        .eq("faculty_id", user.id);

      if (taErr) throw taErr;

      const uniqueClassroomsMap = new Map<string, { id: string; name: string }>();
      (taData || []).forEach((item: any) => {
        if (item.classroom) {
          uniqueClassroomsMap.set(item.classroom.id, {
            id: item.classroom.id,
            name: `${item.classroom.name} (${item.classroom.course} - Sec ${item.classroom.section})`,
          });
        }
      });
      const clsList = Array.from(uniqueClassroomsMap.values());
      setClassrooms(clsList);

      // 2. Fetch classroom members. RLS enforces that faculty only sees members of their assigned classrooms.
      const { data: membersData, error: mErr } = await supabase
        .from("classroom_members")
        .select(`
          id,
          joined_at,
          classroom_id,
          classroom:classrooms!classroom_members_classroom_id_fkey(
            id,
            name,
            course,
            branch,
            year,
            section
          ),
          student:profiles!classroom_members_student_id_fkey(
            id,
            name,
            roll_number,
            email,
            course,
            branch,
            year,
            section
          )
        `);

      if (mErr) throw mErr;

      const parsed: EnrolledStudent[] = (membersData || [])
        .filter((m: any) => m.student)
        .map((m: any) => ({
          id: m.student.id,
          name: m.student.name || "Unnamed Student",
          roll_number: m.student.roll_number || "No Roll",
          email: m.student.email || null,
          course: m.student.course || m.classroom?.course,
          branch: m.student.branch || m.classroom?.branch,
          year: m.student.year || `${m.classroom?.year || ""}`,
          section: m.student.section || m.classroom?.section,
          classroom_id: m.classroom_id,
          classroom_name: m.classroom?.name || "Classroom",
          classroom_info: `${m.classroom?.course || ""} ${m.classroom?.branch || ""} Year ${m.classroom?.year || ""} Sec ${m.classroom?.section || ""}`.trim(),
          joined_at: m.joined_at,
        }));

      // Deduplicate in case a student is in multiple views
      const uniqueStudents = Array.from(
        new Map(parsed.map((s) => [`${s.id}-${s.classroom_id}`, s])).values()
      );

      setStudents(uniqueStudents);
    } catch (err: any) {
      console.error("Error fetching enrolled students:", err);
      toast.error("Failed to load students roster");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnrolledStudents();
  }, [user]);

  // Load student performance data when opening modal
  const handleViewStudent = async (student: EnrolledStudent) => {
    setSelectedStudent(student);
    setStudentModalOpen(true);
    setLoadingStats(true);

    try {
      const [{ data: quizAtts }, { data: asgSubs }] = await Promise.all([
        supabase
          .from("quiz_attempts")
          .select(`
            id,
            score,
            max_score,
            completed_at,
            quiz:quizzes(title, topic, subject)
          `)
          .eq("user_id", student.id),
        supabase
          .from("assignment_submissions")
          .select(`
            id,
            status,
            marks_obtained,
            submitted_at,
            assignment:assignments(title, max_marks, topic, subject)
          `)
          .eq("user_id", student.id),
      ]);

      setStudentQuizzes(quizAtts || []);
      setStudentAssignments(asgSubs || []);
    } catch (err) {
      console.error("Error fetching student performance:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesSearch =
        searchQuery === "" ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.roll_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.email && s.email.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesClassroom =
        selectedClassroomId === "all" || s.classroom_id === selectedClassroomId;

      return matchesSearch && matchesClassroom;
    });
  }, [students, searchQuery, selectedClassroomId]);

  return (
    <FacultyLayout>
      <div className="container max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              Students
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs py-1 px-3">
              {students.length} Total Enrolled
            </Badge>
          </div>
        </div>

        {/* Filters */}
        <Card className="shadow-card border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by student name or roll number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>

              <div className="w-full sm:w-72">
                <select
                  value={selectedClassroomId}
                  onChange={(e) => setSelectedClassroomId(e.target.value)}
                  className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="all">All Assigned Classrooms ({classrooms.length})</option>
                  {classrooms.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Student Roster */}
        {loading ? (
          <div className="flex items-center justify-center p-16 bg-muted/20 rounded-2xl border border-dashed">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : filteredStudents.length === 0 ? (
          <Card className="border-dashed border-2 bg-muted/20">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
              <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                <Users className="h-7 w-7" />
              </div>
              <div className="max-w-md space-y-1">
                <h3 className="text-base font-bold text-foreground">No Students Found</h3>
                <p className="text-sm text-muted-foreground">
                  {students.length === 0
                    ? "No students are currently enrolled in your assigned classrooms. Student accounts are created and enrolled by your administrator."
                    : "No students matched your search criteria."}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="border rounded-2xl overflow-hidden bg-card shadow-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Roll Number</TableHead>
                  <TableHead>Classroom Cohort</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student, idx) => {
                  const initials = student.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();

                  return (
                    <TableRow key={`${student.id}-${student.classroom_id}`} className="hover:bg-muted/30">
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 border">
                            <AvatarFallback className="text-[11px] font-bold bg-indigo-500/10 text-indigo-600">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-semibold text-sm text-foreground">
                            {student.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {student.roll_number}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-xs font-semibold text-foreground">
                            {student.classroom_name}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {student.classroom_info}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {student.email || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          onClick={() => handleViewStudent(student)}
                          size="sm"
                          variant="ghost"
                          className="h-8 gap-1 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Performance</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Student Performance Modal */}
        <Dialog open={studentModalOpen} onOpenChange={setStudentModalOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600" />
                <span>Academic Record: {selectedStudent?.name}</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Roll Number: {selectedStudent?.roll_number} • Cohort: {selectedStudent?.classroom_name}
              </DialogDescription>
            </DialogHeader>

            {loadingStats ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              </div>
            ) : (
              <div className="space-y-6 py-2">
                {/* Summary Metrics */}
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 rounded-xl border bg-muted/40">
                    <div className="text-[11px] text-muted-foreground uppercase font-semibold">
                      Quiz Attempts
                    </div>
                    <div className="text-2xl font-extrabold text-foreground">
                      {studentQuizzes.length}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border bg-muted/40">
                    <div className="text-[11px] text-muted-foreground uppercase font-semibold">
                      Assignments Submitted
                    </div>
                    <div className="text-2xl font-extrabold text-indigo-600">
                      {studentAssignments.length}
                    </div>
                  </div>
                </div>

                {/* Quizzes List */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Diagnostic Quiz History
                  </h4>
                  {studentQuizzes.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-3 border rounded-xl bg-muted/20">
                      No quiz attempts logged for this student yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {studentQuizzes.map((att: any) => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between p-3 rounded-xl border text-xs bg-card"
                        >
                          <div>
                            <div className="font-semibold text-foreground">
                              {att.quiz?.title || "Quiz"}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {att.quiz?.subject} • {att.quiz?.topic}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs font-mono font-bold">
                            {att.score} / {att.max_score || 100}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Assignments List */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Coursework Submissions
                  </h4>
                  {studentAssignments.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-3 border rounded-xl bg-muted/20">
                      No assignment submissions submitted yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {studentAssignments.map((sub: any) => (
                        <div
                          key={sub.id}
                          className="flex items-center justify-between p-3 rounded-xl border text-xs bg-card"
                        >
                          <div>
                            <div className="font-semibold text-foreground">
                              {sub.assignment?.title || "Assignment"}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              Submitted: {new Date(sub.submitted_at).toLocaleDateString()}
                            </div>
                          </div>
                          <Badge
                            className={`text-[11px] ${
                              sub.status === "graded"
                                ? "bg-emerald-600 text-white"
                                : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                            }`}
                          >
                            {sub.status === "graded"
                              ? `${sub.marks_obtained ?? 0} / ${sub.assignment?.max_marks || 20}`
                              : "Pending Review"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </FacultyLayout>
  );
}
