import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  School,
  ArrowLeft,
  Users,
  BookOpen,
  UserPlus,
  UserCheck,
  Plus,
  Trash2,
  Calendar,
  ClipboardList,
  FileCheck2,
  CheckCircle2,
  Loader2,
  Eye,
  TrendingUp,
  Copy,
  Check,
  KeyRound,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ClassroomRecord {
  id: string;
  name: string;
  course: string;
  branch: string;
  year: number;
  section: string;
  academic_year: string;
  created_at: string;
}

export default function AdminClassroomDetailPage() {
  const { classroomId } = useParams<{ classroomId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [classroom, setClassroom] = useState<ClassroomRecord | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [teachingAssignments, setTeachingAssignments] = useState<any[]>([]);
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);

  // Add Student Modal State
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [addStudentLoading, setAddStudentLoading] = useState(false);
  const [studentModalTab, setStudentModalTab] = useState<"create" | "enroll">("create");
  const [studentName, setStudentName] = useState("");
  const [studentRoll, setStudentRoll] = useState("");
  const [studentPassword, setStudentPassword] = useState("");
  const [createdNotice, setCreatedNotice] = useState<{ roll: string; pass: string; name: string } | null>(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);

  // Enroll Existing Student State
  const [availableExistingStudents, setAvailableExistingStudents] = useState<any[]>([]);
  const [selectedExistingStudentId, setSelectedExistingStudentId] = useState("");
  const [enrollExistingLoading, setEnrollExistingLoading] = useState(false);

  // Assign Teacher Modal State
  const [assignTeacherOpen, setAssignTeacherOpen] = useState(false);
  const [assignTeacherLoading, setAssignTeacherLoading] = useState(false);
  const [selectedFacultyId, setSelectedFacultyId] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");

  const fetchClassroomDetails = async () => {
    if (!classroomId) return;
    setLoading(true);

    try {
      // 1. Fetch Classroom Metadata
      const { data: clsData, error: clsErr } = await supabase
        .from("classrooms")
        .select("*")
        .eq("id", classroomId)
        .single();

      if (clsErr) throw clsErr;
      setClassroom(clsData);

      // 2. Fetch Enrolled Students in this classroom
      const { data: membersData, error: mErr } = await supabase
        .from("classroom_members")
        .select(`
          id,
          joined_at,
          student:profiles!classroom_members_student_id_fkey (
            id,
            name,
            roll_number,
            email,
            created_at
          )
        `)
        .eq("classroom_id", classroomId);

      if (!mErr && membersData) {
        setStudents(membersData.filter((m: any) => m.student));
      }

      // Fetch all students to determine who is available to enroll
      const { data: allSts } = await supabase
        .from("profiles")
        .select("id, name, roll_number, email, branch")
        .eq("role", "student")
        .order("name", { ascending: true });

      if (allSts && membersData) {
        const enrolledIds = new Set(membersData.map((m: any) => m.student?.id).filter(Boolean));
        const unenrolled = allSts.filter((s: any) => !enrolledIds.has(s.id));
        setAvailableExistingStudents(unenrolled);
        if (unenrolled.length > 0) {
          setSelectedExistingStudentId(unenrolled[0].id);
        }
      }

      // 3. Fetch Teaching Assignments in this classroom
      const { data: taData, error: taErr } = await supabase
        .from("teaching_assignments")
        .select(`
          id,
          subject_name,
          subject_code,
          faculty_id,
          faculty:profiles!teaching_assignments_faculty_id_fkey (
            id,
            name,
            email,
            faculty_id,
            department
          )
        `)
        .eq("classroom_id", classroomId);

      if (!taErr && taData) {
        setTeachingAssignments(taData);
      }

      // 4. Fetch Available Faculty list for assigning
      const { data: facData } = await supabase
        .from("profiles")
        .select("id, name, faculty_id, department, email")
        .eq("role", "faculty")
        .order("name", { ascending: true });

      if (facData) {
        setFacultyList(facData);
        if (facData.length > 0 && !selectedFacultyId) {
          setSelectedFacultyId(facData[0].id);
        }
      }

      // 5. Fetch Assignments for this classroom
      const { data: asgData } = await supabase
        .from("assignments")
        .select("id, title, topic, subject, deadline, max_marks")
        .eq("classroom_id", classroomId)
        .order("created_at", { ascending: false });

      if (asgData) {
        setAssignments(asgData);
      }

      // 6. Fetch Quizzes for this classroom
      const { data: qzData } = await supabase
        .from("quizzes")
        .select("id, title, topic, subject, difficulty, status, duration_minutes, max_attempts")
        .eq("classroom_id", classroomId)
        .order("created_at", { ascending: false });

      if (qzData) {
        setQuizzes(qzData);
      }

      // 7. Fetch Class Sessions for this classroom
      const { data: sessData } = await supabase
        .from("class_sessions")
        .select(`
          id,
          date,
          topic,
          teaching_notes,
          teaching_assignment:teaching_assignments (
            subject_name,
            faculty:profiles(name)
          )
        `)
        .order("date", { ascending: false });

      if (sessData) {
        // filter sessions belonging to this classroom's teaching assignments
        const taIds = new Set((taData || []).map((t: any) => t.id));
        const filteredSess = sessData.filter((s: any) => taIds.has(s.teaching_assignment?.id));
        setSessions(filteredSess);
      }
    } catch (err: any) {
      console.error("Failed to load classroom detail:", err);
      toast.error("Failed to load classroom details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassroomDetails();
  }, [classroomId]);

  const openAddStudentModal = () => {
    setCreatedNotice(null);
    setStudentName("");
    setStudentRoll("");
    setStudentPassword(`Synapse@${Math.floor(1000 + Math.random() * 9000)}`);
    setStudentModalTab("create");
    setCopiedCredentials(false);
    setAddStudentOpen(true);
  };

  const openAssignTeacherModal = () => {
    if (facultyList.length > 0 && !selectedFacultyId) {
      setSelectedFacultyId(facultyList[0].id);
    }
    setSubjectName("");
    setSubjectCode("");
    setAssignTeacherOpen(true);
  };

  const generateRandomPassword = () => {
    setStudentPassword(`Synapse@${Math.floor(1000 + Math.random() * 9000)}`);
  };

  const handleCopyCredentials = () => {
    if (!createdNotice) return;
    const text = `SYNAPSE STUDENT LOGIN CREDENTIALS
Name: ${createdNotice.name}
Roll Number / Login ID: ${createdNotice.roll}
Initial Password: ${createdNotice.pass}
Classroom: ${classroom?.name || ""}
Course & Branch: ${classroom?.course} - ${classroom?.branch}
Login URL: ${window.location.origin}/login`;

    navigator.clipboard.writeText(text);
    setCopiedCredentials(true);
    toast.success("Student credentials copied to clipboard!");
    setTimeout(() => setCopiedCredentials(false), 2500);
  };

  // Handler: Add Student directly inside this classroom
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !studentRoll.trim() || !studentPassword.trim()) {
      toast.error("Please fill in student name, roll number, and password.");
      return;
    }

    setAddStudentLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_create_student", {
        p_name: studentName.trim(),
        p_roll_number: studentRoll.trim().toUpperCase(),
        p_password: studentPassword,
        p_email: null,
        p_course: classroom?.course || "B.Tech",
        p_branch: classroom?.branch || "CSE",
        p_year: `${classroom?.year || 3}`,
        p_section: classroom?.section || "A",
        p_classroom_id: classroomId,
      });

      if (error) throw error;

      toast.success(`Student ${studentName} created and enrolled into ${classroom?.name}!`);
      setCreatedNotice({
        name: studentName.trim(),
        roll: studentRoll.trim().toUpperCase(),
        pass: studentPassword,
      });

      setStudentName("");
      setStudentRoll("");
      setStudentPassword(`Synapse@${Math.floor(1000 + Math.random() * 9000)}`);
      fetchClassroomDetails();
    } catch (err: any) {
      console.error("Error creating student:", err);
      toast.error("Failed to create student: " + (err.message || "Unknown error"));
    } finally {
      setAddStudentLoading(false);
    }
  };

  // Handler: Enroll Existing Student into this classroom
  const handleEnrollExistingStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExistingStudentId || !classroomId) {
      toast.error("Please select an existing student to enroll.");
      return;
    }

    setEnrollExistingLoading(true);
    try {
      const { error } = await supabase.from("classroom_members").insert({
        classroom_id: classroomId,
        student_id: selectedExistingStudentId,
        role: "student",
      });

      if (error) {
        if (error.code === "23505") {
          throw new Error("This student is already enrolled in this classroom.");
        }
        throw error;
      }

      toast.success("Student successfully enrolled into this classroom cohort!");
      setAddStudentOpen(false);
      fetchClassroomDetails();
    } catch (err: any) {
      console.error("Error enrolling existing student:", err);
      toast.error(err.message || "Failed to enroll student");
    } finally {
      setEnrollExistingLoading(false);
    }
  };

  // Handler: Assign Teacher + Subject to this classroom (allows multiple teachers)
  const handleAssignTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFacultyId || !subjectName.trim()) {
      toast.error("Please select a faculty member and specify a subject name.");
      return;
    }

    setAssignTeacherLoading(true);
    try {
      const { error } = await supabase
        .from("teaching_assignments")
        .insert({
          classroom_id: classroomId,
          faculty_id: selectedFacultyId,
          subject_name: subjectName.trim(),
          subject_code: subjectCode.trim() || null,
        });

      if (error) {
        if (error.code === "23505") {
          throw new Error("This teacher is already assigned to this subject code in this classroom cohort.");
        }
        throw error;
      }

      toast.success(`Assigned "${subjectName}" to teacher for ${classroom?.name}!`);
      setAssignTeacherOpen(false);
      setSubjectName("");
      setSubjectCode("");
      fetchClassroomDetails();
    } catch (err: any) {
      console.error("Error assigning teacher:", err);
      toast.error("Failed to assign teacher: " + err.message);
    } finally {
      setAssignTeacherLoading(false);
    }
  };

  // Handler: Remove teaching assignment
  const handleRemoveAssignment = async (assignmentId: string, subj: string) => {
    if (!confirm(`Are you sure you want to unassign ${subj} from this classroom?`)) return;

    try {
      const { error } = await supabase
        .from("teaching_assignments")
        .delete()
        .eq("id", assignmentId);

      if (error) throw error;
      toast.success(`Unassigned ${subj} successfully`);
      fetchClassroomDetails();
    } catch (err: any) {
      toast.error("Failed to remove assignment: " + err.message);
    }
  };

  // Handler: Remove student from classroom membership
  const handleRemoveMember = async (membershipId: string, studentName: string) => {
    if (!confirm(`Remove ${studentName} from ${classroom?.name}?`)) return;

    try {
      const { error } = await supabase
        .from("classroom_members")
        .delete()
        .eq("id", membershipId);

      if (error) throw error;
      toast.success(`Removed ${studentName} from this classroom`);
      fetchClassroomDetails();
    } catch (err: any) {
      toast.error("Failed to remove student: " + err.message);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Navigation & Header */}
        <div className="space-y-3 border-b pb-6">
          <Link
            to="/admin/classrooms"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Classrooms Directory
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/30 text-xs">
                  Institutional Classroom Cohort
                </Badge>
                <span className="text-xs text-muted-foreground">
                  • Academic Year {classroom?.academic_year || "2026-27"}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mt-1">
                {classroom?.name || "Classroom Hub"}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {classroom?.course} • {classroom?.branch} • Year {classroom?.year}, Section {classroom?.section}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={openAddStudentModal}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs"
                size="sm"
              >
                <UserPlus className="h-4 w-4" />
                <span>Add Student</span>
              </Button>

              <Button
                onClick={openAssignTeacherModal}
                variant="outline"
                className="gap-2 border-indigo-500/30 text-xs"
                size="sm"
              >
                <BookOpen className="h-4 w-4 text-indigo-600" />
                <span>Assign Teacher</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Classroom Detail Tabs */}
        {loading ? (
          <div className="flex items-center justify-center p-20 bg-muted/20 rounded-2xl border border-dashed">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <Tabs defaultValue="students" className="space-y-6">
            <TabsList className="bg-muted/60 p-1 flex-wrap h-auto">
              <TabsTrigger value="overview" className="text-xs gap-1.5">
                <School className="h-3.5 w-3.5" />
                <span>Overview</span>
              </TabsTrigger>
              <TabsTrigger value="students" className="text-xs gap-1.5">
                <Users className="h-3.5 w-3.5" />
                <span>Students ({students.length})</span>
              </TabsTrigger>
              <TabsTrigger value="teachers" className="text-xs gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                <span>Teachers & Subjects ({teachingAssignments.length})</span>
              </TabsTrigger>
              <TabsTrigger value="assignments" className="text-xs gap-1.5">
                <ClipboardList className="h-3.5 w-3.5" />
                <span>Assignments ({assignments.length})</span>
              </TabsTrigger>
              <TabsTrigger value="quizzes" className="text-xs gap-1.5">
                <FileCheck2 className="h-3.5 w-3.5" />
                <span>Quizzes ({quizzes.length})</span>
              </TabsTrigger>
              <TabsTrigger value="attendance" className="text-xs gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>Attendance</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB: OVERVIEW */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="shadow-card border-slate-200 dark:border-slate-800">
                  <CardContent className="p-5 space-y-1">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-xs font-semibold uppercase tracking-wider">Enrolled Students</span>
                      <Users className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div className="text-3xl font-extrabold text-foreground">{students.length}</div>
                    <p className="text-xs text-muted-foreground">Active in this section</p>
                  </CardContent>
                </Card>

                <Card className="shadow-card border-slate-200 dark:border-slate-800">
                  <CardContent className="p-5 space-y-1">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-xs font-semibold uppercase tracking-wider">Teaching Faculty</span>
                      <BookOpen className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="text-3xl font-extrabold text-foreground">{teachingAssignments.length}</div>
                    <p className="text-xs text-muted-foreground">Allocated subjects</p>
                  </CardContent>
                </Card>

                <Card className="shadow-card border-slate-200 dark:border-slate-800">
                  <CardContent className="p-5 space-y-1">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-xs font-semibold uppercase tracking-wider">Assignments</span>
                      <ClipboardList className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="text-3xl font-extrabold text-foreground">{assignments.length}</div>
                    <p className="text-xs text-muted-foreground">Published coursework</p>
                  </CardContent>
                </Card>

                <Card className="shadow-card border-slate-200 dark:border-slate-800">
                  <CardContent className="p-5 space-y-1">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-xs font-semibold uppercase tracking-wider">Quizzes</span>
                      <FileCheck2 className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="text-3xl font-extrabold text-foreground">{quizzes.length}</div>
                    <p className="text-xs text-muted-foreground">Assessments created</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* TAB: STUDENTS */}
            <TabsContent value="students" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">Enrolled Students</h3>
                  <p className="text-xs text-muted-foreground">
                    Students enrolled in this cohort automatically see this classroom upon login.
                  </p>
                </div>
                <Button
                  onClick={openAddStudentModal}
                  size="sm"
                  className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Add Student</span>
                </Button>
              </div>

              {students.length === 0 ? (
                <Card className="border-dashed p-10 text-center bg-muted/20">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <Users className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-semibold text-foreground">No students enrolled yet</p>
                    <p className="text-xs text-muted-foreground">
                      Click "Add Student" below to create or enroll student accounts directly inside {classroom?.name}.
                    </p>
                    <Button
                      onClick={openAddStudentModal}
                      size="sm"
                      className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs mt-2"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      <span>Add Student to {classroom?.name}</span>
                    </Button>
                  </div>
                </Card>
              ) : (
                <div className="border rounded-2xl overflow-hidden bg-card shadow-card">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="w-14">#</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Roll Number</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Enrolled At</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((m, idx) => (
                        <TableRow key={m.id} className="hover:bg-muted/30">
                          <TableCell className="text-xs font-mono text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="text-sm font-semibold text-foreground">{m.student.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs">
                              {m.student.roll_number}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{m.student.email}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(m.joined_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              onClick={() => handleRemoveMember(m.id, m.student.name)}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                              title="Remove from classroom"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* TAB: TEACHERS & SUBJECTS */}
            <TabsContent value="teachers" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">Teaching Assignments</h3>
                  <p className="text-xs text-muted-foreground">
                    Multiple faculty can be allocated to teach subjects for {classroom?.name}.
                  </p>
                </div>
                <Button
                  onClick={openAssignTeacherModal}
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs border-indigo-500/30"
                >
                  <Plus className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Assign Teacher</span>
                </Button>
              </div>

              {teachingAssignments.length === 0 ? (
                <Card className="border-dashed p-10 text-center bg-muted/20">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <BookOpen className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-semibold text-foreground">No teachers assigned yet</p>
                    <p className="text-xs text-muted-foreground">
                      Allocate faculty members to subjects for this classroom cohort. Multiple teachers can be assigned to different subjects.
                    </p>
                    <Button
                      onClick={openAssignTeacherModal}
                      size="sm"
                      className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs mt-2"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Assign Teacher</span>
                    </Button>
                  </div>
                </Card>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {teachingAssignments.map((ta) => (
                      <Card key={ta.id} className="shadow-card border-slate-200 dark:border-slate-800">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <Badge className="bg-indigo-600 text-white text-[10px] mb-1">
                                {ta.subject_code || "SUBJECT"}
                              </Badge>
                              <CardTitle className="text-base font-bold text-foreground">
                                {ta.subject_name}
                              </CardTitle>
                            </div>
                            <Button
                              onClick={() => handleRemoveAssignment(ta.id, ta.subject_name)}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                              title="Unassign Teacher"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="p-3 rounded-xl bg-muted/40 border space-y-1">
                            <span className="text-[11px] text-muted-foreground uppercase font-semibold">
                              Assigned Faculty
                            </span>
                            <div className="font-semibold text-sm text-foreground">
                              {ta.faculty?.name || "Faculty Member"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              ID: {ta.faculty?.faculty_id || "—"} • {ta.faculty?.department || "Dept"}
                            </div>
                            {ta.faculty?.email && (
                              <div className="text-[11px] text-muted-foreground truncate">
                                {ta.faculty.email}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      onClick={openAssignTeacherModal}
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs border-indigo-500/30"
                    >
                      <Plus className="h-3.5 w-3.5 text-indigo-600" />
                      <span>Assign Another Teacher</span>
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* TAB: ASSIGNMENTS */}
            <TabsContent value="assignments" className="space-y-4">
              <h3 className="text-base font-bold text-foreground">Classroom Coursework</h3>
              {assignments.length === 0 ? (
                <Card className="border-dashed p-8 text-center bg-muted/20">
                  <p className="text-sm text-muted-foreground">No assignments published for this classroom yet.</p>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {assignments.map((asg) => (
                    <div key={asg.id} className="flex items-center justify-between p-4 rounded-xl border bg-card">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs text-indigo-600 border-indigo-500/30">
                            {asg.subject || "Coursework"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Due: {new Date(asg.deadline).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-foreground mt-1">{asg.title}</h4>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Max Marks: {asg.max_marks || 20}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* TAB: QUIZZES */}
            <TabsContent value="quizzes" className="space-y-4">
              <h3 className="text-base font-bold text-foreground">Classroom Quizzes</h3>
              {quizzes.length === 0 ? (
                <Card className="border-dashed p-8 text-center bg-muted/20">
                  <p className="text-sm text-muted-foreground">No quizzes published for this classroom yet.</p>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {quizzes.map((quiz) => (
                    <div key={quiz.id} className="flex items-center justify-between p-4 rounded-xl border bg-card">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs text-indigo-600 border-indigo-500/30">
                            {quiz.subject || "Quiz"}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {quiz.topic || "General"}
                          </Badge>
                          <Badge
                            className={`text-[10px] ${
                              quiz.status === "PUBLISHED"
                                ? "bg-emerald-600 text-white"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {quiz.status || "PUBLISHED"}
                          </Badge>
                        </div>
                        <h4 className="text-sm font-bold text-foreground mt-1">{quiz.title}</h4>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {quiz.duration_minutes || 15} mins • Max attempts: {quiz.max_attempts || 1}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* TAB: ATTENDANCE */}
            <TabsContent value="attendance" className="space-y-4">
              <h3 className="text-base font-bold text-foreground">Recorded Class Sessions</h3>
              {sessions.length === 0 ? (
                <Card className="border-dashed p-8 text-center bg-muted/20">
                  <p className="text-sm text-muted-foreground">No attendance sessions recorded for this classroom yet.</p>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {sessions.map((sess) => (
                    <div key={sess.id} className="flex items-center justify-between p-4 rounded-xl border bg-card">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-indigo-600">
                            {sess.teaching_assignment?.subject_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            • {new Date(sess.date).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-foreground mt-0.5">
                          Topic: {sess.topic}
                        </h4>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Faculty: {sess.teaching_assignment?.faculty?.name || "Instructor"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* MODAL: ADD STUDENT DIRECTLY INSIDE THIS CLASSROOM */}
        <Dialog open={addStudentOpen} onOpenChange={setAddStudentOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-indigo-600" />
                <span>Add Student to {classroom?.name}</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Enroll students into this cohort. Enrolled students will immediately see this classroom upon login.
              </DialogDescription>
            </DialogHeader>

            {createdNotice ? (
              <div className="space-y-4 py-3">
                <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Student Created & Enrolled Successfully!</span>
                  </div>
                  <div className="text-xs space-y-2 font-mono bg-background/80 p-3 rounded-xl border">
                    <div className="flex justify-between items-center py-1 border-b border-border/50">
                      <span className="text-muted-foreground font-sans">Full Name:</span>
                      <strong className="text-foreground font-sans font-semibold">{createdNotice.name}</strong>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-border/50">
                      <span className="text-muted-foreground font-sans">Roll Number / Login ID:</span>
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-bold">{createdNotice.roll}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-border/50">
                      <span className="text-muted-foreground font-sans">Initial Password:</span>
                      <span className="text-rose-600 dark:text-rose-400 font-bold">{createdNotice.pass}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-muted-foreground font-sans">Enrolled Classroom:</span>
                      <strong className="text-foreground font-sans">{classroom?.name}</strong>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    onClick={handleCopyCredentials}
                    variant="outline"
                    className="flex-1 gap-2 text-xs"
                  >
                    {copiedCredentials ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    <span>{copiedCredentials ? "Copied to Clipboard!" : "Copy Credentials"}</span>
                  </Button>
                  <Button
                    onClick={() => {
                      setCreatedNotice(null);
                      setAddStudentOpen(false);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <Tabs value={studentModalTab} onValueChange={(v) => setStudentModalTab(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-muted/60 mb-3">
                  <TabsTrigger value="create" className="text-xs gap-1.5">
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Create New Student</span>
                  </TabsTrigger>
                  <TabsTrigger value="enroll" className="text-xs gap-1.5">
                    <UserCheck className="h-3.5 w-3.5" />
                    <span>Enroll Existing ({availableExistingStudents.length})</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="create" className="space-y-4 pt-1">
                  <form onSubmit={handleAddStudent} className="space-y-4">
                    {/* Pre-selected Locked Classroom Cohort */}
                    <div className="space-y-1 p-3 rounded-xl bg-muted/40 border text-xs">
                      <span className="text-[11px] text-muted-foreground uppercase font-semibold">
                        Target Classroom Cohort (Locked)
                      </span>
                      <div className="font-bold text-sm text-foreground">
                        {classroom?.name}
                      </div>
                      <div className="text-muted-foreground">
                        {classroom?.course} • {classroom?.branch} • Year {classroom?.year}, Sec {classroom?.section}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="st-name" className="text-xs font-semibold">Full Name *</Label>
                      <Input
                        id="st-name"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        placeholder="e.g. Chandu Reddy"
                        required
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="st-roll" className="text-xs font-semibold">Roll Number / Student Login ID *</Label>
                      <Input
                        id="st-roll"
                        value={studentRoll}
                        onChange={(e) => setStudentRoll(e.target.value.toUpperCase())}
                        placeholder="e.g. 23CS101"
                        required
                        className="text-xs uppercase font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="st-pass" className="text-xs font-semibold">Initial Password *</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-5 text-[10px] text-indigo-600 px-1.5 gap-1 hover:text-indigo-700"
                          onClick={generateRandomPassword}
                        >
                          <Sparkles className="h-3 w-3" />
                          <span>Generate Random</span>
                        </Button>
                      </div>
                      <Input
                        id="st-pass"
                        value={studentPassword}
                        onChange={(e) => setStudentPassword(e.target.value)}
                        placeholder="Set student login password"
                        required
                        className="text-xs font-mono"
                      />
                    </div>

                    <DialogFooter className="pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAddStudentOpen(false)}
                        disabled={addStudentLoading}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={addStudentLoading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                      >
                        {addStudentLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        <span>Create & Enroll Student</span>
                      </Button>
                    </DialogFooter>
                  </form>
                </TabsContent>

                <TabsContent value="enroll" className="space-y-4 pt-1">
                  {availableExistingStudents.length === 0 ? (
                    <div className="p-6 text-center rounded-xl border border-dashed bg-muted/20 space-y-2">
                      <UserCheck className="h-6 w-6 text-muted-foreground mx-auto" />
                      <p className="text-xs font-semibold text-foreground">No unassigned students found</p>
                      <p className="text-[11px] text-muted-foreground">
                        All registered students in the institution are already enrolled in this classroom cohort, or no other student accounts exist.
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setStudentModalTab("create")}
                        className="text-xs mt-2"
                      >
                        Switch to Create New Student
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleEnrollExistingStudent} className="space-y-4">
                      <div className="space-y-1 p-3 rounded-xl bg-muted/40 border text-xs">
                        <span className="text-[11px] text-muted-foreground uppercase font-semibold">
                          Target Classroom Cohort
                        </span>
                        <div className="font-bold text-sm text-foreground">
                          {classroom?.name}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="existing-st" className="text-xs font-semibold">Select Student to Enroll *</Label>
                        <select
                          id="existing-st"
                          value={selectedExistingStudentId}
                          onChange={(e) => setSelectedExistingStudentId(e.target.value)}
                          className="w-full h-9 rounded-md border bg-background px-3 text-xs"
                          required
                        >
                          {availableExistingStudents.map((st) => (
                            <option key={st.id} value={st.id}>
                              {st.name} ({st.roll_number || st.email}) • {st.branch || "Student"}
                            </option>
                          ))}
                        </select>
                      </div>

                      <DialogFooter className="pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setAddStudentOpen(false)}
                          disabled={enrollExistingLoading}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          size="sm"
                          disabled={enrollExistingLoading}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                        >
                          {enrollExistingLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                          <span>Enroll Student</span>
                        </Button>
                      </DialogFooter>
                    </form>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>

        {/* MODAL: ASSIGN TEACHER TO THIS CLASSROOM */}
        <Dialog open={assignTeacherOpen} onOpenChange={setAssignTeacherOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-600" />
                <span>Assign Teacher to {classroom?.name}</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Select a faculty member and define their subject for this classroom cohort. Multiple teachers can be assigned to different subjects.
              </DialogDescription>
            </DialogHeader>

            {facultyList.length === 0 ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs space-y-3 my-2">
                <p className="font-semibold">No faculty members found</p>
                <p>Please create faculty accounts first from Faculty Management before assigning teachers to this classroom.</p>
                <Button asChild size="sm" variant="outline" className="text-xs w-full">
                  <Link to="/admin/faculty">Go to Faculty Management</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleAssignTeacher} className="space-y-4 py-2">
                <div className="space-y-1.5 p-3 rounded-xl bg-muted/40 border">
                  <Label className="text-xs text-muted-foreground uppercase font-semibold">
                    Classroom (Pre-selected)
                  </Label>
                  <div className="font-bold text-sm text-foreground">
                    {classroom?.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {classroom?.course} • {classroom?.branch} • Year {classroom?.year}, Sec {classroom?.section}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="fac-select" className="text-xs font-semibold">Teacher *</Label>
                  <select
                    id="fac-select"
                    value={selectedFacultyId}
                    onChange={(e) => setSelectedFacultyId(e.target.value)}
                    className="w-full h-9 rounded-md border bg-background px-3 text-xs"
                    required
                  >
                    {facultyList.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.faculty_id ? `ID: ${f.faculty_id}` : f.email} • {f.department || "Dept"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sub-name" className="text-xs font-semibold">Subject Name *</Label>
                  <Input
                    id="sub-name"
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    placeholder="e.g. Database Management Systems"
                    required
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sub-code" className="text-xs font-semibold">Subject Code</Label>
                  <Input
                    id="sub-code"
                    value={subjectCode}
                    onChange={(e) => setSubjectCode(e.target.value.toUpperCase())}
                    placeholder="e.g. CS301"
                    className="text-xs uppercase font-mono"
                  />
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAssignTeacherOpen(false)}
                    disabled={assignTeacherLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={assignTeacherLoading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                  >
                    {assignTeacherLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>Save Teaching Assignment</span>
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
